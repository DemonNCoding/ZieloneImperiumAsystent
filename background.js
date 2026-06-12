// Background service worker for side panel
const GAME_DOMAINS = [
  'zieloneimperium.pl',
  'wurzelimperium.de',
];

let gameTabId = null;

function isGameUrl(url) {
  if (!url) return false;
  return GAME_DOMAINS.some(domain => url.includes(domain));
}

/* ---------- Side Panel: Only open on game pages ---------- */
chrome.action.onClicked.addListener((tab) => {
  if (isGameUrl(tab.url)) {
    chrome.sidePanel.open({ tabId: tab.id });
    gameTabId = tab.id;
  }
});

/* ---------- Track the game tab ---------- */
function updateGameTabId(tabId, url) {
  if (isGameUrl(url)) {
    gameTabId = tabId;
  } else if (tabId === gameTabId) {
    gameTabId = null;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) updateGameTabId(tabId, changeInfo.url);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (isGameUrl(tab.url)) gameTabId = tab.id;
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === gameTabId) gameTabId = null;
});

chrome.runtime.onStartup.addListener(() => scanForGameTab());
chrome.runtime.onInstalled.addListener(() => {
  scanForGameTab();
  chrome.alarms.clearAll();
  reinjectContentScripts();
});

function scanForGameTab() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && isGameUrl(tab.url)) {
        gameTabId = tab.id;
        break;
      }
    }
  });
}

/* ---------- Message Proxy + Alarm Control ---------- */
const AUTOMATION_TYPES = ['water', 'plant', 'harvest'];
const ALARM_INTERVAL_MINUTES = 1 / 10; // 6 seconds between auto ticks

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // ── Popup → background actions ──
  if (sender.id === chrome.runtime.id && (!sender.tab || sender.tab.id === undefined)) {
    
    // Auto toggle: start alarm
    if (msg.action === 'startAuto' && AUTOMATION_TYPES.includes(msg.type)) {
      const alarmName = `auto-${msg.type}`;
      chrome.alarms.create(alarmName, {
        periodInMinutes: ALARM_INTERVAL_MINUTES,
        delayInMinutes: 0,
      });
      chrome.storage.local.set({ [`auto_${msg.type}`]: true });
      // Send initial tick to wake up immediately
      if (gameTabId) {
        chrome.tabs.sendMessage(gameTabId, { action: 'autoTick', type: msg.type }).catch(() => {});
      }
      sendResponse({ success: true });
      return true;
    }
    
    // Auto toggle: stop alarm
    if (msg.action === 'stopAuto' && AUTOMATION_TYPES.includes(msg.type)) {
      chrome.alarms.clear(`auto-${msg.type}`);
      chrome.storage.local.set({ [`auto_${msg.type}`]: false });
      sendResponse({ success: true });
      return true;
    }
    
    // Forward all other actions to game tab
    if (gameTabId) {
      chrome.tabs.sendMessage(gameTabId, msg, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response);
        }
      });
      return true;
    } else {
      sendResponse({ success: false, error: 'No game tab found' });
      return false;
    }
  }

  // ── Content script → popup forwarding ──
  if (sender.tab) {
    if (msg.action === 'locationChanged' || msg.action === 'wateringFinished') {
      chrome.runtime.sendMessage(msg).catch(() => {});
    }
    return false;
  }

  return false;
});

// When alarm fires → send a tick to the game tab's content script
chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith('auto-')) return;
  const type = alarm.name.replace('auto-', '');
  if (!AUTOMATION_TYPES.includes(type)) return;
  if (!gameTabId) return;
  
  chrome.tabs.sendMessage(gameTabId, { action: 'autoTick', type }).catch(() => {});
});

/* ---------- Content script injection ---------- */
function reinjectContentScripts() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && isGameUrl(tab.url)) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        }).catch(() => {});
      }
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isGameUrl(tab.url)) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    }).catch(() => {});
  }
});
