# Search Light Tab Provider - Browser Extension

This browser extension provides live browser tab information to the Search Light GNOME Shell extension.

## Features

- Real-time monitoring of browser tabs (create, update, delete, activate)
- Sends tab information (title, URL, favicon) to native host via Native Messaging
- Automatic reconnection if native host disconnects
- Minimal permissions required

## Installation

### Development Mode (Manual)

1. Open Brave/Chrome and go to `brave://extensions/` or `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser-extension` folder

### Production Mode (Auto-install via Policy)

The extension will be automatically installed when you install the Search Light native application. No manual steps required.

## Permissions

- `tabs`: Required to access tab information (title, URL, favicon)
- `nativeMessaging`: Required to communicate with the native host application

## Architecture

```
Browser Tabs → Extension Background Script → Native Messaging → 
Native Host → D-Bus/File → GNOME Shell Extension → Search Results
```

## Native Messaging

The extension connects to the native host `com.searchlight.tabprovider` and sends JSON messages with the following format:

```json
{
  "type": "tab_update",
  "timestamp": 1234567890,
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

## Testing

Check the browser console for logs:
1. Go to `brave://extensions/` or `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Inspect views: service worker" under the extension
4. Check console for `[SearchLight]` prefixed messages
