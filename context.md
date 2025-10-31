# Search-Light Brave Tab Integration - Context

## Objective
Integrate live Brave browser tabs (titles + URLs) into GNOME Shell search-light extension with real-time updates, zero manual user intervention.

## Core Challenge
Browsers are sandboxed - no direct API access from native apps. Standard solutions (CDP with --remote-debugging-port or manual extension install) are blocked by UX constraints.

## Solution Architecture: Native Messaging + Auto-Installed Extension

### Components
1. **Browser Extension** (Chrome/Brave compatible)
   - Minimal extension using `chrome.tabs` API
   - Monitors tab changes (open/close/update)
   - Sends tab list via Native Messaging to host

2. **Native Messaging Host** (Python/Node.js app)
   - Receives JSON messages from browser extension
   - Caches tab data in memory
   - Exposes data to GNOME Shell extension via D-Bus or file

3. **GNOME Shell Extension Integration**
   - Modify `searchProvider.js` to query tab cache
   - Display tabs in search results
   - Handle tab activation

4. **Auto-Installation Setup**
   - Extension force-installed via Chrome policy: `/etc/opt/chrome/policies/managed/`
   - Native host manifest: `/etc/opt/chrome/native-messaging-hosts/`
   - Single user installation, no manual browser config

## Technical Flow
```
Browser Tab Change → Extension Listener → Native Messaging → 
Native Host (cache) → D-Bus/File → GNOME Extension → Search Results
```

## Key APIs
- **Browser**: `chrome.tabs`, `chrome.runtime.connectNative()`
- **Native**: stdin/stdout JSON messaging
- **GNOME**: Search Provider API, D-Bus (optional)

## Security & Robustness
- ✅ Uses official sandboxed APIs only
- ✅ No session file parsing or UI automation
- ✅ Stable across browser updates
- ✅ Minimal permissions required

## Installation Strategy
- Integrated with existing Makefile build system
- Two-step installation:
  1. User-level: `make build && make install` (GNOME extension)
  2. System-level: `sudo make install-native-host` (native messaging host)
- Browser extension: Manual load (Developer Mode) or publish to Web Store
- User experience: Two commands, minimal configuration

## Installation Commands
```bash
# Step 1: Build and install GNOME extension (as user)
make build
make install
gnome-extensions enable search-light@icedman.github.com

# Step 2: Install native messaging host (requires sudo)
sudo make install-native-host

# Step 3: Install browser extension manually
# Open brave://extensions/, enable Developer Mode,
# click "Load unpacked", select browser-extension/ directory
```
