// Spotify Web Controller - Background Service Worker

/**
 * Finds an active Spotify tab. Prioritizes audible tabs, then active tabs.
 */
async function findSpotifyTab() {
  const tabs = await chrome.tabs.query({ url: "*://open.spotify.com/*" });
  if (!tabs || tabs.length === 0) return null;

  // 1. Check if any tab is currently playing audio
  const audibleTab = tabs.find((t) => t.audible);
  if (audibleTab) return audibleTab;

  // 2. Check if any tab is active in its window
  const activeTab = tabs.find((t) => t.active);
  if (activeTab) return activeTab;

  // 3. Default to the first found Spotify tab
  return tabs[0];
}

/**
 * Ensures content script is injected into the Spotify tab.
 */
async function ensureContentScriptInjected(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "PING" });
    return true;
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      // Small pause to allow script initialization
      await new Promise((r) => setTimeout(r, 100));
      return true;
    } catch (e) {
      console.error("Failed to inject content script:", e);
      return false;
    }
  }
}

/**
 * Forward message to Spotify tab with auto-injection fallback.
 */
async function sendToSpotifyTab(message) {
  const tab = await findSpotifyTab();
  if (!tab) {
    return { success: false, found: false, error: "No Spotify tab open" };
  }

  const injected = await ensureContentScriptInjected(tab.id);
  if (!injected) {
    return { success: false, found: true, tabId: tab.id, error: "Content script injection failed" };
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return { ...response, found: true, tabId: tab.id };
  } catch (err) {
    return { success: false, found: true, tabId: tab.id, error: err.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "QUERY_PLAYER_STATE") {
    sendToSpotifyTab({ action: "GET_PLAYER_STATE" }).then(sendResponse);
    return true; // async response
  }

  if (request.action === "EXECUTE_COMMAND") {
    sendToSpotifyTab({
      action: "COMMAND",
      command: request.command,
      payload: request.payload,
    }).then(sendResponse);
    return true;
  }

  if (request.action === "OPEN_SPOTIFY") {
    chrome.tabs.create({ url: "https://open.spotify.com/" }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  if (request.action === "FOCUS_SPOTIFY") {
    findSpotifyTab().then((tab) => {
      if (tab) {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
        sendResponse({ success: true, tabId: tab.id });
      } else {
        chrome.tabs.create({ url: "https://open.spotify.com/" }, (newTab) => {
          sendResponse({ success: true, tabId: newTab.id });
        });
      }
    });
    return true;
  }

  if (request.action === "OPEN_DETACHED_WINDOW") {
    const popUrl = chrome.runtime.getURL("popup.html?detached=true");
    chrome.windows.create(
      {
        url: popUrl,
        type: "popup",
        width: 340,
        height: 520,
        focused: true,
      },
      (newWin) => {
        sendResponse({ success: true, windowId: newWin ? newWin.id : null });
      }
    );
    return true;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  let mappedCommand = null;
  if (command === "play-pause") mappedCommand = "PLAY_PAUSE";
  else if (command === "next-track") mappedCommand = "NEXT_TRACK";
  else if (command === "prev-track") mappedCommand = "PREV_TRACK";

  if (mappedCommand) {
    await sendToSpotifyTab({
      action: "COMMAND",
      command: mappedCommand,
    });
  }
});
