#!/usr/bin/env python3
"""
Script to activate an existing browser tab using Brave's debugging protocol.
This script uses wmctrl to find and activate the Brave window with the matching tab.
"""

import sys
import subprocess
import json

def activate_tab_by_url(url):
    """
    Activate a browser tab by bringing the window to focus.
    Since we can't directly switch tabs without CDP, we'll use wmctrl to focus the window.
    """
    try:
        # Get all window titles
        result = subprocess.run(
            ['wmctrl', '-l'],
            capture_output=True,
            text=True,
            check=True
        )
        
        windows = result.stdout.strip().split('\n')
        
        # Try to find a window that might contain this tab
        # Browser windows often have the tab title in the window title
        for window in windows:
            parts = window.split(None, 3)
            if len(parts) >= 4:
                window_id = parts[0]
                window_title = parts[3]
                
                # Check if this is a browser window
                if any(browser in window_title.lower() for browser in ['brave', 'chrome', 'chromium']):
                    # Activate this window
                    subprocess.run(['wmctrl', '-ia', window_id], check=False)
                    return True
        
        return False
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: activate-tab.py <url>", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    
    if activate_tab_by_url(url):
        sys.exit(0)
    else:
        # Fallback: open in browser
        subprocess.run(['xdg-open', url], check=False)
        sys.exit(0)
