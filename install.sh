#!/bin/bash
# Installation script for Search Light Browser Tab Integration
# This script installs all components needed for the integration

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_DIR="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Get the actual user (not root when using sudo)
get_real_user() {
    if [ -n "$SUDO_USER" ]; then
        echo "$SUDO_USER"
    else
        echo "$USER"
    fi
}

# Install native messaging host
install_native_host() {
    log_info "Installing native messaging host..."
    
    # Copy the Python script to /usr/bin
    cp "$SCRIPT_DIR/native-host/tab-provider-host.py" /usr/bin/searchlight-tab-provider
    chmod +x /usr/bin/searchlight-tab-provider
    
    log_info "Native host installed to /usr/bin/searchlight-tab-provider"
}

# Install native messaging manifest
install_native_manifest() {
    log_info "Installing native messaging manifest..."
    
    # Get the browser extension ID (will be replaced after publishing)
    EXTENSION_ID="$1"
    
    if [ -z "$EXTENSION_ID" ]; then
        log_warn "No extension ID provided. Using placeholder."
        EXTENSION_ID="EXTENSION_ID_PLACEHOLDER"
    fi
    
    # Create manifest with correct extension ID
    MANIFEST_CONTENT=$(cat "$SCRIPT_DIR/native-host/com.searchlight.tabprovider.json" | \
        sed "s/EXTENSION_ID_PLACEHOLDER/$EXTENSION_ID/g")
    
    # Install for Chrome/Chromium (system-wide)
    mkdir -p /etc/opt/chrome/native-messaging-hosts/
    echo "$MANIFEST_CONTENT" > /etc/opt/chrome/native-messaging-hosts/com.searchlight.tabprovider.json
    
    # Install for Brave (system-wide)
    mkdir -p /etc/opt/brave/native-messaging-hosts/
    echo "$MANIFEST_CONTENT" > /etc/opt/brave/native-messaging-hosts/com.searchlight.tabprovider.json
    
    log_info "Native messaging manifest installed"
}

# Install browser extension policy (auto-install extension)
install_extension_policy() {
    log_info "Installing browser extension policy..."
    
    EXTENSION_ID="$1"
    
    if [ -z "$EXTENSION_ID" ] || [ "$EXTENSION_ID" = "EXTENSION_ID_PLACEHOLDER" ]; then
        log_warn "Extension ID not set. Skipping policy installation."
        log_warn "You will need to manually install the browser extension."
        return
    fi
    
    # Create policy to auto-install extension
    POLICY_CONTENT="{
  \"ExtensionInstallForcelist\": [
    \"$EXTENSION_ID\"
  ]
}"
    
    # Install for Chrome/Chromium
    mkdir -p /etc/opt/chrome/policies/managed/
    echo "$POLICY_CONTENT" > /etc/opt/chrome/policies/managed/searchlight.json
    
    # Install for Brave
    mkdir -p /etc/opt/brave/policies/managed/
    echo "$POLICY_CONTENT" > /etc/opt/brave/policies/managed/searchlight.json
    
    log_info "Browser extension policy installed (auto-install enabled)"
}

# Create cache directory for the user
setup_cache_dir() {
    REAL_USER=$(get_real_user)
    USER_HOME=$(eval echo "~$REAL_USER")
    CACHE_DIR="$USER_HOME/.cache/search-light"
    
    log_info "Setting up cache directory for user: $REAL_USER"
    
    mkdir -p "$CACHE_DIR"
    chown -R "$REAL_USER":"$REAL_USER" "$CACHE_DIR"
    chmod 755 "$CACHE_DIR"
    
    log_info "Cache directory created: $CACHE_DIR"
}

# Build GNOME Shell extension (if needed)
build_gnome_extension() {
    log_info "Building GNOME Shell extension..."
    
    if [ -f "$EXTENSION_DIR/Makefile" ]; then
        cd "$EXTENSION_DIR"
        make
        log_info "GNOME Shell extension built"
    else
        log_warn "Makefile not found, skipping build"
    fi
}

# Install GNOME Shell extension
install_gnome_extension() {
    REAL_USER=$(get_real_user)
    USER_HOME=$(eval echo "~$REAL_USER")
    EXTENSIONS_DIR="$USER_HOME/.local/share/gnome-shell/extensions"
    
    log_info "Installing GNOME Shell extension for user: $REAL_USER"
    
    # Get UUID from metadata.json
    UUID=$(grep -oP '"uuid":\s*"\K[^"]+' "$EXTENSION_DIR/metadata.json")
    
    if [ -z "$UUID" ]; then
        log_error "Could not find UUID in metadata.json"
        exit 1
    fi
    
    TARGET_DIR="$EXTENSIONS_DIR/$UUID"
    
    mkdir -p "$EXTENSIONS_DIR"
    
    # Copy extension files
    if [ -d "$EXTENSION_DIR/build" ]; then
        cp -r "$EXTENSION_DIR/build" "$TARGET_DIR"
    else
        # Copy source files directly
        mkdir -p "$TARGET_DIR"
        cp "$EXTENSION_DIR"/*.js "$TARGET_DIR/" 2>/dev/null || true
        cp "$EXTENSION_DIR"/*.json "$TARGET_DIR/" 2>/dev/null || true
        cp "$EXTENSION_DIR"/*.css "$TARGET_DIR/" 2>/dev/null || true
        cp -r "$EXTENSION_DIR/effects" "$TARGET_DIR/" 2>/dev/null || true
        cp -r "$EXTENSION_DIR/preferences" "$TARGET_DIR/" 2>/dev/null || true
        cp -r "$EXTENSION_DIR/schemas" "$TARGET_DIR/" 2>/dev/null || true
        cp -r "$EXTENSION_DIR/ui" "$TARGET_DIR/" 2>/dev/null || true
        cp -r "$EXTENSION_DIR/apps" "$TARGET_DIR/" 2>/dev/null || true
    fi
    
    chown -R "$REAL_USER":"$REAL_USER" "$TARGET_DIR"
    
    log_info "GNOME Shell extension installed to: $TARGET_DIR"
    log_info "Please log out and log back in, or restart GNOME Shell (Alt+F2, type 'r', Enter)"
}

# Print usage information
print_usage() {
    cat << EOF
Usage: sudo ./install.sh [EXTENSION_ID]

Arguments:
  EXTENSION_ID    Optional: Chrome Web Store extension ID
                  If not provided, you'll need to manually install the browser extension

Examples:
  # Install without auto-install policy (manual browser extension install)
  sudo ./install.sh

  # Install with auto-install policy (requires published extension)
  sudo ./install.sh abcdefghijklmnopabcdefghijklmnop

EOF
}

# Main installation flow
main() {
    log_info "Search Light Browser Tab Integration - Installer"
    log_info "================================================"
    
    EXTENSION_ID="${1:-}"
    
    check_root
    
    install_native_host
    install_native_manifest "$EXTENSION_ID"
    
    if [ -n "$EXTENSION_ID" ] && [ "$EXTENSION_ID" != "EXTENSION_ID_PLACEHOLDER" ]; then
        install_extension_policy "$EXTENSION_ID"
    else
        log_warn ""
        log_warn "To enable auto-install of the browser extension:"
        log_warn "1. Publish the extension to Chrome Web Store"
        log_warn "2. Run: sudo ./install.sh YOUR_EXTENSION_ID"
        log_warn ""
        log_warn "For now, you can manually install the browser extension:"
        log_warn "1. Open brave://extensions/ or chrome://extensions/"
        log_warn "2. Enable Developer Mode"
        log_warn "3. Click 'Load unpacked'"
        log_warn "4. Select: $SCRIPT_DIR/browser-extension"
        log_warn "5. Copy the extension ID and run: sudo ./install.sh EXTENSION_ID"
        log_warn ""
    fi
    
    setup_cache_dir
    build_gnome_extension
    install_gnome_extension
    
    log_info ""
    log_info "Installation complete!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Restart GNOME Shell (Alt+F2, type 'r', press Enter)"
    log_info "   Or log out and log back in"
    log_info "2. Enable the extension in GNOME Extensions app"
    log_info "3. Enable 'Search Engine' in extension preferences"
    log_info "4. Open Brave/Chrome and install the browser extension (if not auto-installed)"
    log_info ""
    log_info "To verify installation:"
    log_info "  - Check native host: ls -l /usr/bin/searchlight-tab-provider"
    log_info "  - Check manifest: ls /etc/opt/chrome/native-messaging-hosts/"
    log_info "  - Check logs: tail -f ~/.cache/search-light/native-host.log"
    log_info "  - Check cache: cat ~/.cache/search-light/browser-tabs.json"
    log_info ""
}

# Run main function
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    print_usage
    exit 0
fi

main "$@"
