# Chrome Extension Troubleshooting Guide

## Steps to Fix "No Logs" / "רענן את הדף ונסה שוב" Issue:

1. **Remove and Re-add the Extension:**
   - Go to chrome://extensions/
   - Find "Domica Facebook Scraper" and click "Remove"
   - Click "Load unpacked" again and select the `src/chrome-extension` folder

2. **Check Chrome DevTools:**
   - On the Facebook page, press F12 to open DevTools
   - Look for these messages in Console:
     - "🚀 Domica content script loaded and ready!"
     - You should also see a blue "Domica Extension Active" indicator briefly appear in the top-right corner

3. **Check Background Script:**
   - Go to chrome://extensions/
   - Find "Domica Facebook Scraper" and click "background page" or "service worker"
   - Look for logs like "Background script loaded" and "Content script injected successfully"

4. **Verify Facebook URL:**
   - Make sure you're on a Facebook groups page
   - URL should look like: https://www.facebook.com/groups/XXXXXX
   - The page must be fully loaded before clicking the extension

5. **Manual Test:**
   - Open Chrome DevTools Console on the Facebook page
   - Paste this code and press Enter:

   ```javascript
   console.log('Test: Looking for posts...');
   const articles = document.querySelectorAll('[role="article"]');
   console.log(`Found ${articles.length} articles`);
   ```

   - If this shows 0 articles, Facebook might have changed their structure

6. **Force Refresh:**
   - Close all Facebook tabs
   - Clear Chrome cache (Ctrl+Shift+Delete, select "Cached images and files")
   - Open Facebook groups page fresh
   - Wait for page to fully load
   - Try the extension again

## Common Issues:

- **Content script not injecting:** The manifest now includes all Facebook URL variations
- **No visual feedback:** Added blue indicator that shows when script loads
- **Timeout issues:** Extended timeout to 30 seconds for slow connections
- **Facebook structure changes:** Added multiple fallback methods to find posts

## Debug Mode:

If still having issues, open Chrome DevTools and run:

```javascript
localStorage.setItem('domica_debug', 'true');
```

Then reload the page for more verbose logging.
