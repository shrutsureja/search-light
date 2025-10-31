#!/usr/bin/env python3
"""
Search Light Tab Provider - Native Messaging Host

This script acts as a bridge between the browser extension and GNOME Shell extension.
It receives tab information from the browser via Native Messaging (stdin/stdout)
and exposes it to the GNOME Shell extension via D-Bus.

Protocol:
- Browser Extension -> Native Host: JSON via stdin (Native Messaging format)
- Native Host -> GNOME Extension: D-Bus service or shared file
"""

import sys
import json
import struct
import logging
import os
from pathlib import Path
from threading import Thread, Lock
import time

# Setup logging
LOG_DIR = Path.home() / ".cache" / "search-light"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE = LOG_DIR / "native-host.log"

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stderr)
    ]
)

logger = logging.getLogger(__name__)

# Tab cache file
CACHE_DIR = Path.home() / ".cache" / "search-light"
CACHE_FILE = CACHE_DIR / "browser-tabs.json"

# Lock for thread-safe file operations
cache_lock = Lock()

# In-memory tab cache
tab_cache = []


def send_message(message):
    """
    Send a message to the browser extension using Native Messaging protocol.
    
    Native Messaging format:
    - First 4 bytes: message length (32-bit integer, native byte order)
    - Following bytes: JSON message
    """
    try:
        encoded_message = json.dumps(message).encode('utf-8')
        message_length = len(encoded_message)
        
        # Write message length (4 bytes, little-endian)
        sys.stdout.buffer.write(struct.pack('I', message_length))
        # Write message content
        sys.stdout.buffer.write(encoded_message)
        sys.stdout.buffer.flush()
        
        logger.debug(f"Sent message to browser: {message}")
    except Exception as e:
        logger.error(f"Error sending message: {e}")


def read_message():
    """
    Read a message from the browser extension using Native Messaging protocol.
    
    Returns:
        dict or None: The received message or None on error/EOF
    """
    try:
        # Read message length (4 bytes)
        raw_length = sys.stdin.buffer.read(4)
        
        if len(raw_length) == 0:
            logger.info("Browser extension disconnected (EOF)")
            return None
        
        if len(raw_length) != 4:
            logger.error(f"Invalid message length: {len(raw_length)} bytes")
            return None
        
        message_length = struct.unpack('I', raw_length)[0]
        
        # Read message content
        message_content = sys.stdin.buffer.read(message_length)
        
        if len(message_content) != message_length:
            logger.error(f"Message truncated: expected {message_length}, got {len(message_content)}")
            return None
        
        # Decode JSON
        message = json.loads(message_content.decode('utf-8'))
        logger.debug(f"Received message from browser: {message.get('type', 'unknown')}")
        
        return message
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return None
    except Exception as e:
        logger.error(f"Error reading message: {e}")
        return None


def save_tabs_to_cache(tabs):
    """
    Save tab list to cache file (JSON format).
    This file will be read by the GNOME Shell extension.
    
    Args:
        tabs: List of tab dictionaries
    """
    global tab_cache
    
    try:
        with cache_lock:
            tab_cache = tabs
            
            # Ensure cache directory exists
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            
            # Write to temporary file first, then rename (atomic operation)
            temp_file = CACHE_FILE.with_suffix('.tmp')
            
            cache_data = {
                "timestamp": time.time(),
                "tab_count": len(tabs),
                "tabs": tabs
            }
            
            with open(temp_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
            
            # Atomic rename
            temp_file.replace(CACHE_FILE)
            
            logger.info(f"Saved {len(tabs)} tabs to cache: {CACHE_FILE}")
            
    except Exception as e:
        logger.error(f"Error saving tabs to cache: {e}")


def handle_message(message):
    """
    Handle messages received from the browser extension.
    
    Args:
        message: Dictionary containing the message from browser
    """
    if not message:
        return
    
    msg_type = message.get('type', 'unknown')
    
    if msg_type == 'tab_update':
        tabs = message.get('tabs', [])
        timestamp = message.get('timestamp', 0)
        
        logger.info(f"Received tab update: {len(tabs)} tabs at {timestamp}")
        
        # Save tabs to cache file
        save_tabs_to_cache(tabs)
        
        # Send acknowledgment back to browser
        send_message({
            "type": "ack",
            "tab_count": len(tabs),
            "status": "ok"
        })
        
    else:
        logger.warning(f"Unknown message type: {msg_type}")


def cleanup():
    """Cleanup resources on exit."""
    logger.info("Native host shutting down...")
    
    # Optionally clear cache on exit
    # CACHE_FILE.unlink(missing_ok=True)


def main():
    """Main entry point for the native messaging host."""
    logger.info("Search Light Tab Provider - Native Host starting...")
    logger.info(f"Cache file: {CACHE_FILE}")
    logger.info(f"Log file: {LOG_FILE}")
    
    try:
        # Send initial ready message
        send_message({
            "type": "ready",
            "version": "1.0.0"
        })
        
        # Main message loop
        while True:
            message = read_message()
            
            if message is None:
                # EOF or error - exit gracefully
                break
            
            handle_message(message)
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
    except Exception as e:
        logger.error(f"Unexpected error in main loop: {e}", exc_info=True)
    finally:
        cleanup()
    
    logger.info("Native host exited")
    return 0


if __name__ == "__main__":
    sys.exit(main())
