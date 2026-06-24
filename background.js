chrome.action.onClicked.addListener(async (tab) => {
  // Ignore internal browser pages where content scripts cannot run
  if (!tab.url || 
      tab.url.startsWith("chrome://") || 
      tab.url.startsWith("chrome-extension://") || 
      tab.url.startsWith("edge://") || 
      tab.url.startsWith("about:") ||
      tab.url.startsWith("view-source:")) {
    console.log("Cannot run ProLearner on internal browser pages.");
    return;
  }

  try {
    // Send message to the tab to toggle the sidebar
    await chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
  } catch (error) {
    // Content script is not yet active. Inject it programmatically.
    console.log("Content script not active. Injecting content.js dynamically...");
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      // Send toggle command after execution has finished
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" });
        } catch (e) {
          console.error("Failed to toggle sidebar after script injection:", e);
        }
      }, 150);
    } catch (err) {
      console.error("Injection failed:", err);
    }
  }
});
