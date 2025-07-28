// Smart Facebook Post Extractor - Works with Facebook's dynamic loading
console.log('🚀 Smart Domica content script loaded!');

// Visual indicator
const indicator = document.createElement('div');
indicator.textContent = 'Smart Domica Active';
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #8b5cf6;
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

// Process visible posts
function processVisiblePosts() {
  const posts = [];
  const processedIds = new Set();
  
  // Find all feed items currently in the DOM
  const feed = document.querySelector('[role="feed"]');
  if (!feed) return posts;
  
  // Get all potential posts - try multiple selectors
  let potentialPosts = feed.querySelectorAll('div[data-pagelet*="FeedUnit"]');
  
  // If no posts found with pagelet, try direct children approach
  if (potentialPosts.length === 0) {
    console.log('No pagelet posts found, trying feed children...');
    potentialPosts = Array.from(feed.children).filter(child => child.offsetHeight > 200);
  }
  
  console.log(`Processing ${potentialPosts.length} potential posts`);
  
  potentialPosts.forEach((post, index) => {
    // Create unique ID for this post
    const postId = post.getAttribute('data-pagelet') || Math.random().toString();
    if (processedIds.has(postId)) return;
    processedIds.add(postId);
    
    // Get text content
    const textElements = post.querySelectorAll('div[data-ad-preview="message"], div[dir="auto"]');
    const texts = [];
    
    textElements.forEach(el => {
      const isComment = el.closest('[aria-label*="Comment"]') || el.closest('[aria-label*="תגובה"]');
      if (!isComment) {
        const text = el.textContent.trim();
        if (text.length > 50 && text.match(/[\u05d0-\u05ea]/)) {
          texts.push(text);
        }
      }
    });
    
    if (texts.length === 0) {
      console.log(`Post ${index}: No text found`);
      return;
    }
    
    const fullText = texts.join('\n');
    console.log(`Post ${index}: Found text (${fullText.length} chars)`);
    
    // Check if it's a rental offer
    if (!isRentalOffer(fullText)) {
      console.log(`Post ${index}: Not a rental offer - "${fullText.substring(0, 50)}..."`);
      return;
    }
    
    // Get author
    const authorEl = post.querySelector('strong');
    const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
    
    // Extract price
    const price = extractPrice(fullText);
    
    console.log(`✅ Post ${index}: Rental offer by ${author}, price: ${price || 'not found'}`);
    
    posts.push({
      text: fullText,
      author: author,
      rawPrices: price ? [price] : [],
      phones: []
    });
  });
  
  return posts;
}

// Expand "See more" buttons
function expandSeeMore() {
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

// Smart extraction with incremental scrolling
async function smartExtract() {
  console.log('🧠 Starting smart extraction...');
  const allPosts = [];
  const seenTexts = new Set();
  
  // Function to add unique posts
  function addUniquePosts(newPosts) {
    newPosts.forEach(post => {
      // Create unique key based on author + price (if available) + first 50 chars
      const priceKey = post.rawPrices.length > 0 ? post.rawPrices[0] : 'no-price';
      const uniqueKey = `${post.author}-${priceKey}-${post.text.substring(0, 50)}`;
      
      if (!seenTexts.has(uniqueKey)) {
        seenTexts.add(uniqueKey);
        allPosts.push(post);
      } else {
        console.log(`Skipping duplicate: ${post.author} - ${priceKey}`);
      }
    });
  }
  
  // Initial expansion and scan
  console.log('📊 Initial expansion and scan...');
  let expanded = expandSeeMore();
  if (expanded > 0) {
    console.log(`Expanded ${expanded} posts`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  let posts = processVisiblePosts();
  addUniquePosts(posts);
  console.log(`Found ${posts.length} posts initially`);
  
  // Scroll and scan incrementally
  let lastHeight = 0;
  let noNewContentCount = 0;
  
  for (let i = 0; i < 10; i++) {
    // Scroll down
    window.scrollBy(0, window.innerHeight);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Expand any new "See more" buttons
    expanded = expandSeeMore();
    if (expanded > 0) {
      console.log(`Expanded ${expanded} more posts`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Process newly visible posts
    posts = processVisiblePosts();
    const beforeCount = allPosts.length;
    addUniquePosts(posts);
    const afterCount = allPosts.length;
    
    console.log(`Scroll ${i + 1}: Found ${afterCount - beforeCount} new posts (total: ${afterCount})`);
    
    // Check if we've reached the end
    const currentHeight = document.body.scrollHeight;
    if (currentHeight === lastHeight) {
      noNewContentCount++;
      if (noNewContentCount >= 2) {
        console.log('No new content after 2 attempts, stopping');
        break;
      }
    } else {
      noNewContentCount = 0;
    }
    lastHeight = currentHeight;
  }
  
  console.log(`✅ Smart extraction complete: ${allPosts.length} rental offers found`);
  return allPosts;
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Received:', request.action);
  
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return false;
  }
  
  if (request.action === 'extractPosts') {
    console.log('🏃 Running smart extraction...');
    
    (async () => {
      try {
        const posts = await smartExtract();
        console.log(`✉️ Sending ${posts.length} posts`);
        sendResponse({ posts: posts });
      } catch (error) {
        console.error('Error:', error);
        sendResponse({ posts: [] });
      }
    })();
    
    return true;
  }
});

// Make function available for testing
window.smartExtract = smartExtract;