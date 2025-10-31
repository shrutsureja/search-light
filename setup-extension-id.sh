#!/bin/bash
# Helper script to get the browser extension ID and update manifests

echo "Browser Tab Integration - Setup Helper"
echo "======================================="
echo ""

# Check if extension is loaded
echo "Please follow these steps:"
echo ""
echo "1. Open Brave/Chrome and go to: brave://extensions/"
echo "2. Enable 'Developer mode' (toggle in top-right)"
echo "3. Click 'Load unpacked'"
echo "4. Select this directory: $(pwd)/browser-extension/"
echo ""
echo "5. After loading, find the Extension ID (looks like: abcdefghijklmnop...)"
echo "6. Copy the Extension ID and paste it below"
echo ""
echo -n "Enter Extension ID: "
read EXTENSION_ID

if [ -z "$EXTENSION_ID" ]; then
    echo "Error: No Extension ID provided"
    exit 1
fi

echo ""
echo "Updating native messaging manifests with Extension ID: $EXTENSION_ID"

# Create updated manifest
cat > /tmp/com.searchlight.tabprovider.json << EOF
{
  "name": "com.searchlight.tabprovider",
  "description": "Search Light Tab Provider - Native Messaging Host",
  "path": "/usr/bin/searchlight-tab-provider",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://${EXTENSION_ID}/"
  ]
}
EOF

# Update system manifests (requires sudo)
echo "Updating system manifests (requires sudo)..."
sudo cp /tmp/com.searchlight.tabprovider.json /etc/opt/chrome/native-messaging-hosts/com.searchlight.tabprovider.json 2>/dev/null
sudo cp /tmp/com.searchlight.tabprovider.json /etc/opt/brave/native-messaging-hosts/com.searchlight.tabprovider.json 2>/dev/null

# Update user manifests
mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
mkdir -p ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/
cp /tmp/com.searchlight.tabprovider.json ~/.config/google-chrome/NativeMessagingHosts/
cp /tmp/com.searchlight.tabprovider.json ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/

echo ""
echo "✓ Manifests updated successfully!"
echo ""
echo "Next steps:"
echo "  1. Restart your browser"
echo "  2. Check browser extension console (inspect service worker)"
echo "  3. Monitor logs: tail -f ~/.cache/search-light/native-host.log"
echo ""
