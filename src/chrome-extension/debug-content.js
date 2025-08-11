// Debug Facebook Post Extractor - Works with current Facebook structure
console.log('🚀 Debug Domica content script loaded!');

// Visual indicator
const indicator = document.createElement('div');
indicator.textContent = 'Domica Debug Active';
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
setTimeout(() => indicator.remove(), 5000);

// Debug mode flag
const DEBUG = true;

function debugLog(...args) {
  if (DEBUG) console.log('[DOMICA DEBUG]', ...args);
}

// Check if post is offering a rental (not looking for one)
function isRentalOffer(text) {
  const lowerText = text.toLowerCase();
  debugLog('Checking text for rental offer:', text.substring(0, 100));
  
  // Keywords indicating someone is LOOKING for a rental (exclude these)
  const seekingKeywords = [
    'מחפש', 'מחפשת', 'מחפשים', 'מחפשות',
    'מעוניין', 'מעוניינת', 'מעוניינים',
    'דרוש', 'דרושה', 'דרושים',
    'צריך', 'צריכה', 'צריכים',
    'זוג מחפשים', 'זוג צעיר מחפש',
    'מחפשת דירה', 'מחפש דירה',
    'מחפשים דירה', 'מחפשות דירה'
  ];
  
  // Keywords indicating OFFERING a rental
  const offerKeywords = [
    'להשכרה', 'להשכיר', 'משכיר', 'משכירה',
    'פנויה', 'פנוי', 'חדש להשכרה',
    'בבלעדיות', 'כניסה מיידית', 'מתפנה', 'מתפנית',
    'יחידת דיור להשכרה', 'סאבלט', 'מפנה דירה',
    'מתפנה חדר', 'עוזבת את דירתי'
  ];
  
  // First check if it's clearly someone LOOKING for a place
  // These patterns are strong indicators of seeking posts
  const seekingPatterns = [
    /^מחפש/,  // Starts with "looking for"
    /^מחפשת/,
    /^מחפשים/,
    /^מחפשות/,
    /^היי.*מחפש/,  // "Hi... looking for"
    /^שלום.*מחפש/,
    /^בוקר טוב.*מחפש/,
    /^זוג.*מחפש/,
    /תקציב עד/,  // "budget up to"
    /עד\s+\d+\s*ש[״"']ח/  // "up to X shekels"
  ];
  
  // Check for seeking patterns
  for (const pattern of seekingPatterns) {
    if (text.match(pattern)) {
      debugLog('Strong seeking pattern found - rejecting');
      return false;
    }
  }
  
  // Check if it has any seeking keywords in the first 100 characters
  const firstPart = text.substring(0, 100).toLowerCase();
  const hasSeekingKeyword = seekingKeywords.some(keyword => firstPart.includes(keyword));
  
  // Check if it has offer keywords
  const hasOfferKeyword = offerKeywords.some(keyword => lowerText.includes(keyword));
  
  // IMPORTANT: If seeking keyword appears early in the text, it's likely someone looking
  if (hasSeekingKeyword && !hasOfferKeyword) {
    debugLog('Seeking keyword found without offer keyword - rejecting');
    return false;
  }
  
  // If it has clear offer keywords, accept it
  if (hasOfferKeyword) {
    // But double-check it's not a seeking post with the word "להשכרה" in it
    if (hasSeekingKeyword && !text.includes('מתפנ') && !text.includes('עוזב')) {
      debugLog('Has offer keyword but also seeking - likely someone describing what they want - rejecting');
      return false;
    }
    debugLog('Found offer keyword - accepting as rental offer');
    return true;
  }
  
  debugLog('No clear rental offer indicators found - rejecting');
  return false;
}

// Extract price from text
function extractPrice(text) {
  const pricePatterns = [
    /₪\s*(\d{1,2},?\d{3})/,
    /(\d{1,2},?\d{3})\s*₪/,
    /(\d{1,2},?\d{3})\s*ש["״]ח/,
    /(\d{1,2},?\d{3})\s*שח/,
    /מחיר:?\s*(\d{1,2},?\d{3})/,
    /(\d{4,5})(?=\s|$)/
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (pattern === pricePatterns[pricePatterns.length - 1]) {
        const num = parseInt(match[1]);
        if (num >= 3000 && num <= 20000) {
          debugLog('Found price:', match[1]);
          return match[1];
        }
      } else {
        debugLog('Found price:', match[1]);
        return match[1];
      }
    }
  }
  
  return null;
}

// Extract phone numbers from text
function extractPhones(text) {
  const phones = [];
  const phonePatterns = [
    /05\d[-\s]?\d{7,8}/g,  // Israeli mobile
    /0\d{1,2}[-\s]?\d{7}/g, // Israeli landline
    /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g // Alternative format
  ];
  
  for (const pattern of phonePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const phone = match[0].replace(/[-\s]/g, '');
      if (phone.length >= 9 && phone.length <= 10) {
        phones.push(phone);
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(phones)];
}

// Find posts using the specific class pattern identified
function findAllPosts() {
  debugLog('Starting post search...');
  
  // Use the exact class pattern that Facebook uses for posts
  // This pattern was verified from actual posts: x1yztbdb x1n2onr6 xh8yej3 x1ja2u2z
  const posts = document.querySelectorAll('.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z');
  debugLog(`✅ Found ${posts.length} posts with Facebook's post class pattern`);
  
  // Log dimensions for debugging
  posts.forEach((post, i) => {
    const rect = post.getBoundingClientRect();
    debugLog(`Post ${i + 1}: height=${Math.round(rect.height)}px, top=${Math.round(rect.top)}px`);
  });
  
  return Array.from(posts);
}

// Get all posts in order for smart scrolling
function getOrderedPosts() {
  const posts = findAllPosts();
  
  // Sort by their position on the page (top to bottom)
  posts.sort((a, b) => {
    const aTop = a.getBoundingClientRect().top + window.pageYOffset;
    const bTop = b.getBoundingClientRect().top + window.pageYOffset;
    return aTop - bTop;
  });
  
  return posts;
}

// Smart scroll to next post
function scrollToNextPost(currentPostIndex = -1) {
  const posts = getOrderedPosts();
  
  if (posts.length === 0) {
    debugLog('No posts found for scrolling');
    return { nextIndex: -1, scrolled: false };
  }
  
  debugLog(`Scrolling from post index ${currentPostIndex} (total posts: ${posts.length})`);
  
  // Find the next post to scroll to
  for (let i = currentPostIndex + 1; i < posts.length; i++) {
    const post = posts[i];
    const rect = post.getBoundingClientRect();
    
    // If this post is below the current viewport, scroll to it
    if (rect.top > 100) {
      // Calculate scroll position to put the post at the top with some padding
      const scrollTarget = window.pageYOffset + rect.top - 80;
      
      window.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      });
      
      debugLog(`📍 Scrolled to post ${i + 1}/${posts.length} at position ${scrollTarget}px`);
      return { nextIndex: i, scrolled: true };
    }
  }
  
  // If we've processed all visible posts, scroll down to load more
  debugLog('All visible posts processed, scrolling to load more...');
  window.scrollBy(0, window.innerHeight);
  return { nextIndex: posts.length - 1, scrolled: true };
}

// Process visible posts with better extraction
function processVisiblePosts() {
  const posts = [];
  const processedIds = new Set();
  
  debugLog('Processing visible posts...');
  
  const allPosts = findAllPosts();
  debugLog(`Total unique elements to process: ${allPosts.length}`);
  
  allPosts.forEach((post, index) => {
    // Create unique ID for this post
    const postId = post.getAttribute('data-pagelet') || 
                   post.getAttribute('id') || 
                   Math.random().toString();
    
    if (processedIds.has(postId)) {
      debugLog(`Post ${index}: Already processed`);
      return;
    }
    processedIds.add(postId);
    
    // Get text content - try multiple selectors
    const textSelectors = [
      'div[data-ad-preview="message"]',
      'div[dir="auto"]',
      'span[dir="auto"]',
      'div[style*="text-align"]'
    ];
    
    const texts = [];
    
    for (const selector of textSelectors) {
      const elements = post.querySelectorAll(selector);
      elements.forEach(el => {
        // Skip if it's in a comment section
        const isComment = el.closest('[aria-label*="Comment"]') || 
                         el.closest('[aria-label*="תגובה"]') ||
                         el.closest('[role="complementary"]');
        
        if (!isComment) {
          const text = el.textContent.trim();
          if (text.length > 50 && text.match(/[\u05d0-\u05ea]/)) {
            texts.push(text);
            debugLog(`Post ${index}: Found text with selector ${selector}: "${text.substring(0, 50)}..."`);
          }
        }
      });
    }
    
    if (texts.length === 0) {
      debugLog(`Post ${index}: No text found`);
      return;
    }
    
    const fullText = [...new Set(texts)].join('\n');
    debugLog(`Post ${index}: Combined text (${fullText.length} chars)`);
    
    // Check if it's a rental offer
    if (!isRentalOffer(fullText)) {
      debugLog(`Post ${index}: Not a rental offer`);
      return;
    }
    
    // Get author - disable for now due to Facebook's complex structure
    // Facebook dynamically loads author names and obfuscates them, making
    // reliable extraction very difficult. Better to show Unknown than wrong names.
    let author = 'Unknown';
    
    // DISABLED: Author extraction is unreliable on current Facebook structure
    // The names being picked up (like "Mozhgan") are from other elements on the page
    // not the actual post authors. Until we can reliably extract the correct author,
    // we'll keep all as "Unknown" to avoid confusion.
    
    debugLog(`Post ${index}: Author extraction disabled - keeping as Unknown`);
    
    // Extract price
    const price = extractPrice(fullText);
    
    // Extract phone numbers
    const phones = extractPhones(fullText);
    
    debugLog(`✅ Post ${index}: Rental offer by ${author}, price: ${price || 'not found'}, phones: ${phones.join(', ') || 'none'}`);
    
    posts.push({
      text: fullText,
      author: author,
      rawPrices: price ? [price] : [],
      phones: phones,
      debug: {
        selector: post.tagName,
        hasDataPagelet: !!post.getAttribute('data-pagelet'),
        height: post.offsetHeight
      }
    });
  });
  
  debugLog(`Processed ${posts.length} rental posts out of ${allPosts.length} total elements`);
  return posts;
}

// Expand "See more" buttons
function expandSeeMore() {
  debugLog('Looking for "See more" buttons...');
  const buttons = document.querySelectorAll('div[role="button"]');
  let expanded = 0;
  
  buttons.forEach(button => {
    const text = button.textContent || '';
    if (text.match(/See more|עוד|הצג עוד|ראה עוד/)) {
      debugLog('Found expandable button:', text);
      button.click();
      expanded++;
    }
  });
  
  debugLog(`Expanded ${expanded} buttons`);
  return expanded;
}

// Smart extraction with post-by-post scrolling
async function smartExtract() {
  debugLog('🧠 Starting smart extraction with post-by-post scrolling...');
  
  // Log page structure
  debugLog('Page structure check:');
  const postCount = document.querySelectorAll('.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z').length;
  debugLog('- Posts with class pattern:', postCount);
  debugLog('- Has [role="feed"]:', !!document.querySelector('[role="feed"]'));
  debugLog('- URL:', window.location.href);
  
  const allPosts = [];
  const seenTexts = new Set();
  
  function addUniquePosts(newPosts) {
    newPosts.forEach(post => {
      const priceKey = post.rawPrices.length > 0 ? post.rawPrices[0] : 'no-price';
      const uniqueKey = `${post.author}-${priceKey}-${post.text.substring(0, 50)}`;
      
      if (!seenTexts.has(uniqueKey)) {
        seenTexts.add(uniqueKey);
        allPosts.push(post);
        debugLog(`Added unique post: ${post.author} - ${priceKey}`);
      } else {
        debugLog(`Skipping duplicate: ${post.author} - ${priceKey}`);
      }
    });
  }
  
  // Initial expansion and scan
  debugLog('📊 Initial expansion and scan...');
  let expanded = expandSeeMore();
  if (expanded > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  let posts = processVisiblePosts();
  addUniquePosts(posts);
  debugLog(`Found ${posts.length} rental posts initially from ${postCount} total posts`);
  
  // Smart scroll through posts one by one
  let currentPostIndex = -1;
  let noNewContentCount = 0;
  let lastPostCount = postCount;
  const maxIterations = 20; // Maximum number of scroll attempts
  
  for (let i = 0; i < maxIterations; i++) {
    debugLog(`\n--- Iteration ${i + 1}/${maxIterations} ---`);
    
    // Scroll to next post
    const scrollResult = scrollToNextPost(currentPostIndex);
    
    if (!scrollResult.scrolled) {
      debugLog('No more posts to scroll to');
      break;
    }
    
    currentPostIndex = scrollResult.nextIndex;
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Expand any new "See more" buttons
    expanded = expandSeeMore();
    if (expanded > 0) {
      debugLog(`Expanded ${expanded} "See more" buttons`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Process newly visible posts
    posts = processVisiblePosts();
    const beforeCount = allPosts.length;
    addUniquePosts(posts);
    const afterCount = allPosts.length;
    
    // Check how many posts are now on the page
    const currentPostCount = document.querySelectorAll('.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z').length;
    debugLog(`Posts on page: ${currentPostCount} (was ${lastPostCount})`);
    debugLog(`Rental posts found this iteration: ${afterCount - beforeCount} (total: ${afterCount})`);
    
    // Check if new content was loaded
    if (currentPostCount === lastPostCount) {
      noNewContentCount++;
      debugLog(`No new posts loaded (attempt ${noNewContentCount})`);
      
      if (noNewContentCount >= 3) {
        debugLog('No new content after 3 attempts, stopping');
        break;
      }
      
      // Try scrolling more aggressively to trigger loading
      debugLog('Scrolling more to trigger content loading...');
      window.scrollBy(0, window.innerHeight * 1.5);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      noNewContentCount = 0;
      lastPostCount = currentPostCount;
    }
    
    // Update current post index if new posts were loaded
    if (currentPostCount > currentPostIndex + 1) {
      // Continue from where we were
      debugLog(`New posts loaded, continuing from index ${currentPostIndex}`);
    } else {
      // We've reached the last visible post
      currentPostIndex = currentPostCount - 1;
    }
  }
  
  debugLog(`\n✅ Smart extraction complete: ${allPosts.length} rental offers found from ${lastPostCount} total posts`);
  
  // If no posts found, provide diagnostic info
  if (allPosts.length === 0) {
    debugLog('⚠️ No rental posts found! Diagnostic info:');
    debugLog('- Total posts on page:', document.querySelectorAll('.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z').length);
    debugLog('- Page has Hebrew text:', !!document.body.textContent.match(/[\u05d0-\u05ea]/));
    
    // Return diagnostic data
    return [{
      text: 'DEBUG: No rental posts found. Check console for diagnostic information.',
      author: 'Debug Mode',
      rawPrices: [],
      phones: [],
      debug: {
        totalPostsOnPage: document.querySelectorAll('.x1yztbdb.x1n2onr6.xh8yej3.x1ja2u2z').length,
        pageHasHebrew: !!document.body.textContent.match(/[\u05d0-\u05ea]/),
        feedExists: !!document.querySelector('[role="feed"]')
      }
    }];
  }
  
  return allPosts;
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('📨 Received:', request.action);
  
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return false;
  }
  
  if (request.action === 'extractPosts') {
    debugLog('🏃 Running debug extraction...');
    
    (async () => {
      try {
        const posts = await smartExtract();
        debugLog(`✉️ Sending ${posts.length} posts`);
        sendResponse({ posts: posts });
      } catch (error) {
        console.error('Error:', error);
        debugLog('Error details:', error.message, error.stack);
        sendResponse({ posts: [] });
      }
    })();
    
    return true;
  }
});

// Make function available for testing
window.smartExtract = smartExtract;
window.debugDomica = {
  findAllPosts,
  processVisiblePosts,
  isRentalOffer,
  extractPrice
};

debugLog('Debug content script ready. Functions available in window.debugDomica');