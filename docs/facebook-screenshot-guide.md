# Facebook Screenshot/PDF Guide

## 📋 Quick Steps

1. **Install the Bookmarklet** (one-time setup)
2. **Go to Facebook group**
3. **Click bookmarklet** to expand all posts
4. **Take screenshot/PDF**
5. **Upload to Domica**

## 🔧 Setup Instructions

### Option 1: Bookmarklet (Easiest)

1. **Copy this entire code**:
```javascript
javascript:(async()=>{console.log('🔍 Expanding Facebook posts...');let e=0;async function t(){const t=document.body.scrollHeight,o=window.innerHeight;let n=window.pageYOffset;for(;n<t-o;)n+=.8*o,window.scrollTo(0,n),await new Promise(e=>setTimeout(e,1e3)),l();window.scrollTo(0,0),await new Promise(e=>setTimeout(e,500))}function l(){let t=[];return["//div[@role='button'][contains(., 'See more')]","//div[@role='button'][contains(., 'עוד')]","//div[@role='button'][contains(., 'הצג עוד')]","//div[@role='button'][contains(., 'ראה עוד')]"].forEach(e=>{const l=document.evaluate(e,document,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);for(let e=0;e<l.snapshotLength;e++){const o=l.snapshotItem(e);o&&!t.includes(o)&&t.push(o)}}),document.querySelectorAll('div[role="button"]').forEach(e=>{const l=e.textContent||"";(l.includes("See more")||l.includes("עוד")||l.includes("הצג עוד")||l.includes("ראה עוד"))&&!t.includes(e)&&t.push(e)}),t.forEach(t=>{try{t.click(),e++,console.log(`✅ Expanded post ${e}`)}catch(e){console.log("Failed:",e)}}),t.length}await t();let o=0,n=0;do{o=l(),n++,o>0&&await new Promise(e=>setTimeout(e,1e3))}while(o>0&&n<10);console.log(`✨ Done! Expanded ${e} posts.`),window.scrollTo(0,0),alert(`✅ הורחבו ${e} פוסטים!\n📸 הדף מוכן לצילום מסך או PDF`)})();
```

2. **Create a bookmark**:
   - Right-click bookmarks bar → "Add page" / "הוסף דף"
   - Name: "הרחב פוסטים"
   - URL: Paste the code above

3. **Use it**:
   - Go to Facebook group
   - Click the bookmark
   - Wait for completion message

### Option 2: Console Script

1. Open Facebook group
2. Press `F12` (Developer Tools)
3. Go to "Console" tab
4. Paste and run:

```javascript
// Paste the content from facebook-expand-posts.js
```

## 📸 Taking Screenshots

### For Images (Chrome/Edge):
1. After expanding posts, press `F12`
2. Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
3. Type "screenshot"
4. Choose "Capture full size screenshot"

### For PDF (Better for text):
1. After expanding posts, press `Ctrl+P` (Windows) or `Cmd+P` (Mac)
2. Destination: "Save as PDF"
3. Settings:
   - Layout: Portrait
   - Paper size: A4
   - Margins: None
   - Scale: Fit to page
4. Click "Save"

## 🚀 Tips for Best Results

1. **Scroll First**: Let the page load completely before running the script
2. **Multiple Pages**: For many posts, take multiple PDFs (Facebook may limit)
3. **Dark Mode**: Switch to light mode for better OCR results
4. **Clean View**: Hide chat and sidebars before capturing

## ⚠️ Troubleshooting

### Posts not expanding?
- Facebook may have updated their layout
- Try the manual approach:
  ```javascript
  document.querySelectorAll('div[role="button"]').forEach(b => {
    if (b.textContent?.match(/עוד|See more|הצג עוד/)) b.click();
  });
  ```

### Script blocked?
- Some browsers block bookmarklets on Facebook
- Use the Console method instead

### Too many posts?
- Process in batches (scroll to specific date ranges)
- Take multiple screenshots/PDFs

## 🎯 Hebrew-Specific Tips

The script looks for these Hebrew variations:
- עוד
- הצג עוד  
- ראה עוד

If Facebook uses different Hebrew text, update the script accordingly.