// Background service worker for side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));


  chrome.runtime.onInstalled.addListener(() => {
  console.log("🔁 Extension reloaded — re-injecting content scripts...");
  reinjectContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("🚀 Extension startup — re-injecting content scripts...");
  reinjectContentScripts();
});

const GAME_DOMAINS = [
  'zieloneimperium.pl',
  'wurzelimperium.de',
  // Add English domain here if one exists
];

function isGameTab(url) {
  return GAME_DOMAINS.some(domain => url.includes(domain));
}

function reinjectContentScripts() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.url && isGameTab(tab.url)) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        }, () => {
          if (chrome.runtime.lastError) {
            // console.warn("⚠️ Could not inject into", tab.url, chrome.runtime.lastError.message);
          } else {
            console.log("✅ Content script re-injected into", tab.url);
          }
        });
      }
    }
  });
}
