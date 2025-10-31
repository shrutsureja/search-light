// Background service worker for Search Light Tab Provider
// Monitors browser tabs and sends updates to native host via Native Messaging

const NATIVE_HOST_NAME = "com.searchlight.tabprovider";

let port = null;
let reconnectTimer = null;
let tabCache = [];

/**
 * Connect to the native messaging host
 */
function connectToNativeHost() {
  console.log("[SearchLight] Connecting to native host:", NATIVE_HOST_NAME);
  
  try {
    port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    
    port.onMessage.addListener((message) => {
      console.log("[SearchLight] Message from native host:", message);
      
      // Handle requests from native host (if any)
      if (message.type === "get_tabs") {
        sendTabList();
      }
    });
    
    port.onDisconnect.addListener(() => {
      console.log("[SearchLight] Disconnected from native host");
      if (chrome.runtime.lastError) {
        console.error("[SearchLight] Error:", chrome.runtime.lastError.message);
      }
      port = null;
      
      // Try to reconnect after 5 seconds
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(() => {
        connectToNativeHost();
      }, 5000);
    });
    
    // Send initial tab list
    sendTabList();
    
  } catch (error) {
    console.error("[SearchLight] Failed to connect to native host:", error);
    
    // Retry connection after 5 seconds
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = setTimeout(() => {
      connectToNativeHost();
    }, 5000);
  }
}

/**
 * Get all open tabs and send to native host
 */
async function sendTabList() {
  try {
    const tabs = await chrome.tabs.query({});
    
    // Filter and format tab information
    tabCache = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || "Untitled",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || "",
      windowId: tab.windowId,
      active: tab.active,
      pinned: tab.pinned
    }));
    
    if (port) {
      const message = {
        type: "tab_update",
        timestamp: Date.now(),
        tabs: tabCache
      };
      
      port.postMessage(message);
      console.log(`[SearchLight] Sent ${tabCache.length} tabs to native host`);
    } else {
      console.warn("[SearchLight] Not connected to native host, cannot send tabs");
    }
  } catch (error) {
    console.error("[SearchLight] Error getting tabs:", error);
  }
}

/**
 * Handle tab creation
 */
chrome.tabs.onCreated.addListener((tab) => {
  console.log("[SearchLight] Tab created:", tab.id, tab.title);
  sendTabList();
});

/**
 * Handle tab updates (URL change, title change, etc.)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only send updates when important properties change
  if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
    console.log("[SearchLight] Tab updated:", tabId, changeInfo);
    sendTabList();
  }
});

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log("[SearchLight] Tab removed:", tabId);
  sendTabList();
});

/**
 * Handle tab activation (switching tabs)
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log("[SearchLight] Tab activated:", activeInfo.tabId);
  sendTabList();
});

/**
 * Handle window focus change
 */
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    console.log("[SearchLight] Window focused:", windowId);
    sendTabList();
  }
});

/**
 * Initialize extension
 */
console.log("[SearchLight] Tab Provider extension starting...");
connectToNativeHost();

// Send tab list every 30 seconds as a heartbeat
setInterval(() => {
  if (port) {
    sendTabList();
  } else {
    connectToNativeHost();
  }
}, 30000);
