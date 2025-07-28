// Simple Facebook Post Extractor - Direct approach
console.log('🚀 Simple Domica content script loaded!');

// Visual indicator
const indicator = document.createElement('div');
indicator.textContent = 'Simple Domica Active';
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #ef4444;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 9999;
  font-family: Arial, sans-serif;
`;
document.body.appendChild(indicator);
setTimeout(() => indicator.remove(), 3000);

// Check if post is offering a rental (not looking for one)
function isRentalOffer(text) {
  const lowerText = text.toLowerCase();
  
  // Keywords indicating someone is LOOKING for a rental
  const seekingKeywords = [
    'מחפש', 'מחפשת', 'מחפשים', 'מחפשות',
    'מעוניין', 'מעוניינת', 'מעוניינים',
    'דרוש', 'דרושה', 'דרושים',
    'צריך', 'צריכה', 'צריכים',
    'זוג מחפשים', 'זוג צעיר'
  ];
  
  // Check if it's a seeking post
  for (const keyword of seekingKeywords) {
    if (lowerText.includes(keyword)) {
      return false; // It's someone looking, not offering
    }
  }
  
  // Keywords indicating OFFERING a rental
  const offerKeywords = [
    'להשכרה', 'להשכיר', 'משכיר', 'משכירה',
    'פנויה', 'פנוי', 'חדש להשכרה',
    'בבלעדיות', 'כניסה מיידית'
  ];
  
  // Must have at least one offer keyword
  for (const keyword of offerKeywords) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

// Extract price from text
function extractPrice(text) {
  // Look for price patterns - more flexible
  const pricePatterns = [
    /₪\s*(\d{1,2},?\d{3})/,
    /(\d{1,2},?\d{3})\s*₪/,
    /(\d{1,2},?\d{3})\s*ש["״]ח/,
    /(\d{1,2},?\d{3})\s*שח/,
    /מחיר:?\s*(\d{1,2},?\d{3})/,
    /(\d{4,5})(?=\s|$)/ // Any 4-5 digit number that might be a price
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      // For the last pattern, verify it's likely a price (3000-20000 range)
      if (pattern === pricePatterns[pricePatterns.length - 1]) {
        const num = parseInt(match[1]);
        if (num >= 3000 && num <= 20000) {
          return match[1];
        }
      } else {
        return match[1];
      }
    }
  }
  
  return null;
}

// Simple extraction function
function extractPosts() {
  console.log('🔍 Simple extraction starting...');
  const posts = [];
  
  // Find the feed
  const feed = document.querySelector('[role="feed"]');
  if (!feed) {
    console.log('❌ No feed found');
    return posts;
  }
  
  // Get feed children
  const feedChildren = Array.from(feed.children);
  console.log(`Found ${feedChildren.length} feed children`);
  
  let postCount = 0;
  let skippedCount = 0;
  
  feedChildren.forEach((child, i) => {
    // Skip small elements
    if (child.offsetHeight < 200) return;
    
    // Look for post content
    const postTexts = [];
    const allTexts = child.querySelectorAll('div[data-ad-preview="message"], div[data-ad-comet-preview="message"], div[dir="auto"]');
    
    allTexts.forEach(el => {
      // Skip comments
      const isComment = el.closest('[aria-label*="Comment"]') || el.closest('[aria-label*="תגובה"]');
      if (isComment) return;
      
      const text = el.textContent.trim();
      if (text.length > 50 && text.match(/[\u05d0-\u05ea]/)) {
        postTexts.push(text);
      }
    });
    
    if (postTexts.length > 0) {
      // Get full text
      const fullText = postTexts.join('\n');
      
      // Check if it's a rental offer (not someone looking)
      if (!isRentalOffer(fullText)) {
        skippedCount++;
        console.log(`Skipped post ${i}: Someone looking for apartment`);
        return;
      }
      
      // Get author
      const authorEl = child.querySelector('strong');
      const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
      
      // Extract price
      const price = extractPrice(fullText);
      
      posts.push({
        text: fullText,
        author: author,
        index: i,
        rawPrices: price ? [price] : [],
        phones: [] // TODO: extract phone numbers
      });
      
      postCount++;
      console.log(`Post ${postCount}: ${author} - Price: ${price || 'לא צוין'} - ${fullText.substring(0, 50)}...`);
    }
  });
  
  console.log(`✅ Found ${posts.length} rental offers (skipped ${skippedCount} looking-for posts)`);
  return posts;
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received:', request.action);
  
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return false;
  }
  
  if (request.action === 'extractPosts') {
    console.log('🏃 Running simple extraction with scrolling...');
    
    // Function to expand "See more" buttons
    function expandPosts() {
      const buttons = document.querySelectorAll('div[role="button"]');
      let expanded = 0;
      
      buttons.forEach(button => {
        const text = button.textContent || '';
        if (text.match(/See more|עוד|הצג עוד|ראה עוד/)) {
          button.click();
          expanded++;
        }
      });
      
      return expanded;
    }
    
    // Scroll to load more posts
    let scrollCount = 0;
    const scrollInterval = setInterval(() => {
      // Expand posts BEFORE scrolling
      const expandedBefore = expandPosts();
      if (expandedBefore > 0) {
        console.log(`Expanded ${expandedBefore} posts before scroll`);
      }
      
      // Wait a bit for expansion to complete
      setTimeout(() => {
        window.scrollTo(0, document.body.scrollHeight);
        scrollCount++;
        console.log(`Scroll ${scrollCount}...`);
        
        // Expand posts AFTER scrolling
        setTimeout(() => {
          const expandedAfter = expandPosts();
          if (expandedAfter > 0) {
            console.log(`Expanded ${expandedAfter} posts after scroll`);
          }
        }, 1000);
      }, 500);
      
      if (scrollCount >= 5) {
        clearInterval(scrollInterval);
        
        // Final expand and wait
        setTimeout(() => {
          expandPosts();
          
          // Extract after final wait
          setTimeout(() => {
            try {
              const posts = extractPosts();
              console.log(`✉️ Sending ${posts.length} posts`);
              sendResponse({ posts: posts });
            } catch (error) {
              console.error('Error:', error);
              sendResponse({ posts: [] });
            }
          }, 2000);
        }, 1000);
      }
    }, 2000);
    
    return true;
  }
});

// Make function available for testing
window.simpleExtract = extractPosts;