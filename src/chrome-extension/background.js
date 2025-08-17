// Background script for debugging
console.log('Background script loaded');

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com/groups/')) {
    console.log('Facebook group page loaded:', tab.url);
    
    // Try to inject content script manually if needed
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['smart-content.js']
    }).then(() => {
      console.log('Smart content script injected successfully');
    }).catch(err => {
      console.error('Failed to inject smart content script:', err);
    });
  }
});

// Listen for extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});