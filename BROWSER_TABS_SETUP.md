# Browser Tab Integration - Setup Guide

This guide explains how to install the browser tab integration feature for Search Light.

## Overview

The browser tab integration allows you to search and switch to open Brave/Chrome tabs directly from the GNOME search interface.

**Components:**
- GNOME Shell extension (modified searchProvider.js)
- Native messaging host (Python script)
- Browser extension (Chrome/Brave compatible)

## Installation Steps

### 1. Build and Install GNOME Extension

```bash
cd /home/kevit/work/test/update-search-engine
make build
make install
gnome-extensions enable search-light@icedman.github.com
```

### 2. Install Native Messaging Host (requires sudo)

```bash
sudo make install-native-host
```

This will:
- Install `/usr/bin/searchlight-tab-provider`
- Set up native messaging manifests in `/etc/opt/chrome/` and `/etc/opt/brave/`
- Create cache directory at `~/.cache/search-light/`

### 3. Install Browser Extension

1. Open your browser and go to:
   - Brave: `brave://extensions/`
   - Chrome: `chrome://extensions/`

2. Enable **Developer mode** (toggle in top-right corner)

3. Click **Load unpacked**

4. Navigate to and select:
   ```
   /home/kevit/work/test/update-search-engine/browser-extension/
   ```

5. The extension should now be installed and active

### 4. Restart GNOME Shell

Press `Alt+F2`, type `r`, and press Enter (X11)

Or log out and log back in (Wayland)

## Verification

### Check Native Host

```bash
# Verify installation
ls -l /usr/bin/searchlight-tab-provider

# Check manifest files
ls /etc/opt/chrome/native-messaging-hosts/
ls /etc/opt/brave/native-messaging-hosts/

# Check user config
ls ~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/
ls ~/.config/google-chrome/NativeMessagingHosts/
```

### Monitor Logs

```bash
# Watch native host logs
tail -f ~/.cache/search-light/native-host.log

# Check tab cache
cat ~/.cache/search-light/browser-tabs.json | jq .
```

### Test Browser Extension

1. Open browser developer tools for the extension:
   - Go to `brave://extensions/` or `chrome://extensions/`
   - Find "Search Light Tab Provider"
   - Click **Inspect views: service worker**

2. Check console for `[SearchLight]` messages

3. Open some tabs and verify logs show tab updates

### Test Search

1. Open GNOME search (Super key or your configured shortcut)
2. Type part of a tab title or URL
3. You should see matching browser tabs in results
4. Click a tab to switch to it

## Troubleshooting

### Extension not connecting to native host

**Check browser extension console for errors:**
```
Error: "Specified native messaging host not found"
```

**Solution:**
- Verify manifest is installed: `ls /etc/opt/brave/native-messaging-hosts/`
- Check the manifest has correct path: `cat /etc/opt/brave/native-messaging-hosts/com.searchlight.tabprovider.json`
- Ensure script is executable: `ls -l /usr/bin/searchlight-tab-provider`

### No tabs appearing in search

**Check cache file:**
```bash
cat ~/.cache/search-light/browser-tabs.json
```

**If empty or missing:**
1. Check native host logs: `tail ~/.cache/search-light/native-host.log`
2. Verify browser extension is running (check service worker)
3. Restart browser

### GNOME extension not showing tabs

**Check GNOME Shell logs:**
```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

**Common issues:**
- `browserTabs.js` not copied: Re-run `make install`
- Import error: Check file exists at `~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/browserTabs.js`

## Uninstallation

### Remove Browser Extension
1. Go to `brave://extensions/`
2. Click **Remove** on "Search Light Tab Provider"

### Remove Native Host
```bash
sudo rm /usr/bin/searchlight-tab-provider
sudo rm /etc/opt/chrome/native-messaging-hosts/com.searchlight.tabprovider.json
sudo rm /etc/opt/brave/native-messaging-hosts/com.searchlight.tabprovider.json
rm -rf ~/.cache/search-light/
```

### Disable GNOME Extension
```bash
gnome-extensions disable search-light@icedman.github.com
# Or uninstall completely
rm -rf ~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/
```

## Architecture Diagram

```
Browser Tabs
    ↓
Browser Extension (background.js)
    ↓ (Native Messaging: stdin/stdout JSON)
Native Host (tab-provider-host.py)
    ↓ (JSON file)
~/.cache/search-light/browser-tabs.json
    ↓ (File read)
GNOME Extension (browserTabs.js)
    ↓
Search Results (searchProvider.js)
```

## Files Location Reference

| Component | Location |
|-----------|----------|
| GNOME Extension | `~/.local/share/gnome-shell/extensions/search-light@icedman.github.com/` |
| Native Host Binary | `/usr/bin/searchlight-tab-provider` |
| Native Manifest (Brave) | `/etc/opt/brave/native-messaging-hosts/com.searchlight.tabprovider.json` |
| Native Manifest (Chrome) | `/etc/opt/chrome/native-messaging-hosts/com.searchlight.tabprovider.json` |
| User Manifest (Brave) | `~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/` |
| Tab Cache | `~/.cache/search-light/browser-tabs.json` |
| Logs | `~/.cache/search-light/native-host.log` |
| Browser Extension Source | `./browser-extension/` |

## Development Notes

See `context.md` for technical architecture details.

To modify the search behavior, edit `searchProvider.js` in the GNOME extension.
