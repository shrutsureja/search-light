# Search Light Tab Provider - Native Host

This native messaging host bridges the browser extension and GNOME Shell extension.

## Architecture

```
Browser Extension → stdin/stdout (Native Messaging) → Native Host → 
JSON Cache File → GNOME Shell Extension
```

## Components

### tab-provider-host.py
Python script that:
- Receives tab data from browser extension via stdin (Native Messaging protocol)
- Saves tab information to `~/.cache/search-light/browser-tabs.json`
- Logs activity to `~/.cache/search-light/native-host.log`

### com.searchlight.tabprovider.json
Native messaging host manifest that registers the host with Chrome/Brave.

## Installation

### Manual Installation (Development)

1. Make the script executable:
```bash
chmod +x tab-provider-host.py
```

2. Copy to system location:
```bash
sudo cp tab-provider-host.py /usr/bin/searchlight-tab-provider
```

3. Update the manifest with your extension ID:
```bash
# Get the extension ID from brave://extensions/
# Edit com.searchlight.tabprovider.json and replace EXTENSION_ID_PLACEHOLDER
```

4. Install the manifest:
```bash
# For Brave/Chrome (system-wide)
sudo mkdir -p /etc/opt/chrome/native-messaging-hosts/
sudo cp com.searchlight.tabprovider.json /etc/opt/chrome/native-messaging-hosts/

# For Brave/Chrome (user-level)
mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
cp com.searchlight.tabprovider.json ~/.config/google-chrome/NativeMessagingHosts/

# For Brave specifically
mkdir -p ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/
cp com.searchlight.tabprovider.json ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/
```

### Automated Installation (Production)

Use the provided installation script (see install.sh in project root).

## Testing

1. Check if the native host is registered:
```bash
# Brave
ls ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/

# Chrome
ls ~/.config/google-chrome/NativeMessagingHosts/
```

2. Monitor the log file:
```bash
tail -f ~/.cache/search-light/native-host.log
```

3. Check the cache file:
```bash
cat ~/.cache/search-light/browser-tabs.json | jq .
```

## Cache File Format

The native host saves tab data in JSON format:

```json
{
  "timestamp": 1234567890.123,
  "tab_count": 5,
  "tabs": [
    {
      "id": 123,
      "title": "Example Page",
      "url": "https://example.com",
      "favIconUrl": "https://example.com/favicon.ico",
      "windowId": 1,
      "active": true,
      "pinned": false
    }
  ]
}
```

## Troubleshooting

### Native host not connecting

1. Check the manifest path is correct
2. Verify the script is executable: `ls -l /usr/bin/searchlight-tab-provider`
3. Check logs: `tail ~/.cache/search-light/native-host.log`
4. Test the script manually:
```bash
echo '{"type":"test"}' | /usr/bin/searchlight-tab-provider
```

### Extension ID mismatch

The `allowed_origins` in the manifest must match your browser extension ID exactly.
Get it from `brave://extensions/` with Developer mode enabled.

## Requirements

- Python 3.6+
- Standard library only (no external dependencies)
