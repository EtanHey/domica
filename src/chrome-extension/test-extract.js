// Simple test to check what's happening
console.log('Test script loaded');

// Make this globally available
window.testExtract = function() {
  console.log('Starting test extraction...');
  
  // Check for feed
  const feed = document.querySelector('[role="feed"]');
  if (!feed) {
    console.log('❌ No feed found');
    return [];
  }
  
  console.log('✅ Feed found');
  
  // Get feed children
  const children = Array.from(feed.children);
  console.log(`📦 Feed has ${children.length} children`);
  
  // Look for posts
  const posts = [];
  children.forEach((child, index) => {
    if (child.offsetHeight < 100) {
      console.log(`Child ${index}: Too small (${child.offsetHeight}px)`);
      return;
    }
    
    // Get text
    const texts = [];
    child.querySelectorAll('div[dir="auto"], span[dir="auto"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 20) texts.push(text);
    });
    
    const fullText = texts.join('\n');
    if (fullText.length > 50 && fullText.match(/[\u05d0-\u05ea]/)) {
      console.log(`Child ${index}: Valid post with ${fullText.length} chars`);
      posts.push({
        index: index,
        text: fullText.substring(0, 100) + '...',
        height: child.offsetHeight
      });
    } else {
      console.log(`Child ${index}: Not a valid post (${fullText.length} chars)`);
    }
  });
  
  console.log(`Found ${posts.length} posts`);
  return posts;
};

// Run test immediately
window.testExtract();