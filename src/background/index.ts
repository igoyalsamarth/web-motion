chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "configure-hotkeys",
    title: "Configure Hotkeys",
    contexts: ["page", "selection", "link"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "configure-hotkeys" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_TOPBAR" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_TOPBAR" });
  }
});
