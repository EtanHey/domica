// Facebook Group Post Extractor
class FacebookPostExtractor {
  constructor() {
    this.posts = [];
  }

  // Extract all posts from the page
  extractPosts() {
    const posts = [];
    const processedTexts = new Set(); // Track unique posts
    
    console.log('🔍 Starting post extraction...');
    
    // Facebook uses different structures for posts
    // Look for posts with multiple approaches
    let postElements = [];
    
    // Debug: Log current page info
    console.log('Page URL:', window.location.href);
    console.log('Page height:', document.body.scrollHeight);
    
    // Method 1: Look for all role="article" elements first
    const articles = document.querySelectorAll('[role="article"]');
    console.log(`Found ${articles.length} article elements`);
    postElements.push(...articles);
    
    // Method 2: Look for feed containers and posts within them
    const feedSelectors = [
      '[role="feed"]',
      'div[data-pagelet*="FeedUnit"]'
    ];
    
    for (const selector of feedSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        elements.forEach(el => {
          if (!postElements.includes(el)) {
            postElements.push(el);
          }
        });
      }
    }
    
    // Method 2: If no feed found, look for individual posts
    if (postElements.length === 0) {
      // Look for posts by their structure
      const postSelectors = [
        // Main post containers
        'div[role="article"]',
        // Posts often have this structure
        'div[data-pagelet*="FeedUnit"]',
        // Alternative structure
        'div[class*="x1yztbdb"][class*="x1n2onr6"]'
      ];
      
      for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          postElements.push(...elements);
          // Don't break - collect from all selectors
        }
      }
    }
    
    // Method 3: Fallback - look for any posts with text content
    if (postElements.length === 0) {
      console.log('Using fallback method to find posts...');
      // Look for containers with substantial text
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach(div => {
        const text = div.textContent || '';
        // Check if it looks like a post
        if (text.length > 100 && 
            text.match(/[א-ת]/) && 
            (text.includes('להשכרה') || text.includes('דירה') || text.includes('חדרים')) &&
            !div.querySelector('div[role="article"]')) { // Avoid nested posts
          postElements.push(div);
        }
      });
      console.log(`Fallback method found ${postElements.length} potential posts`);
    }
    
    console.log(`Total post elements found: ${postElements.length}`);
    
    // Filter and process posts
    const uniquePosts = new Map();
    
    postElements.forEach((element, index) => {
      try {
        // Skip if this is inside a comment section
        const isInCommentSection = element.closest('[aria-label*="Comment"]') || 
                                  element.closest('[aria-label*="תגובה"]') ||
                                  element.closest('[role="complementary"]');
        
        if (isInCommentSection) {
          console.log(`Skipping element ${index}: inside comment section`);
          return;
        }
        
        // Look for the main content area of the post
        const contentSelectors = [
          '[data-ad-preview="message"]',
          'div[dir="auto"][style*="text-align"]',
          'div[data-testid="post_message"]',
          'span[dir="auto"]'
        ];
        
        let postContent = '';
        for (const selector of contentSelectors) {
          const contentElements = element.querySelectorAll(selector);
          if (contentElements.length > 0) {
            const texts = Array.from(contentElements)
              .map(el => el.textContent.trim())
              .filter(text => text.length > 20);
            if (texts.length > 0) {
              postContent = texts.join('\n');
              break;
            }
          }
        }
        
        // If no content found with specific selectors, try general approach
        if (!postContent) {
          const allTexts = element.querySelectorAll('div[dir="auto"], span[dir="auto"]');
          const texts = Array.from(allTexts)
            .filter(el => !el.closest('[aria-label*="Like"]') && !el.closest('[aria-label*="Comment"]'))
            .map(el => el.textContent.trim())
            .filter(text => text.length > 20);
          postContent = texts.join('\n');
        }
        
        // Skip if no content at all
        if (!postContent || postContent.length < 20) {
          console.log(`Skipping element ${index}: no content (${postContent.length} chars)`);
          return;
        }
        
        // Skip if doesn't contain Hebrew
        if (!postContent.match(/[א-ת]/)) {
          console.log(`Skipping element ${index}: no Hebrew content`);
          return;
        }
        
        // Add all posts, even potential duplicates
        uniquePosts.set(`post_${index}_${Date.now()}`, element);
        console.log(`Added element ${index} as post`);
        
      } catch (e) {
        console.error(`Error processing element ${index}:`, e);
      }
    });
    
    console.log(`Filtered to ${uniquePosts.size} unique posts`);

    // Process unique posts
    let processedCount = 0;
    uniquePosts.forEach((element, contentHash) => {
      try {
        const postData = this.extractPostData(element);
        if (postData && postData.text) {
          console.log(`Processing post ${processedCount}: ${postData.text.substring(0, 50)}...`);
          
          if (this.isRentalPost(postData)) {
            posts.push(postData);
            console.log(`✅ Added as rental post #${posts.length}`);
          } else {
            console.log(`❌ Not a rental offer post`);
          }
        }
        processedCount++;
      } catch (e) {
        console.error('Error extracting post data:', e);
      }
    });

    console.log(`✅ Found ${posts.length} rental posts out of ${uniquePosts.size} unique posts`);
    return posts;
  }

  // Extract data from a single post
  extractPostData(postElement) {
    console.log('📋 Extracting data from post element...');
    
    // Get all text content from the post
    let fullText = '';
    const texts = [];
    
    // Method 1: Look for main post content area
    const contentAreas = postElement.querySelectorAll('[data-ad-preview="message"], [data-testid="post_message"]');
    if (contentAreas.length > 0) {
      contentAreas.forEach(area => {
        const text = area.textContent.trim();
        if (text && !texts.includes(text)) {
          texts.push(text);
        }
      });
    }
    
    // Method 2: Get text from styled divs (Facebook's text containers)
    if (texts.length === 0) {
      const textElements = postElement.querySelectorAll('div[dir="auto"], span[dir="auto"]');
      
      textElements.forEach(el => {
        // Skip if it's inside reactions, comments, or other UI elements
        const isUIElement = el.closest('[aria-label*="Like"]') ||
                           el.closest('[aria-label*="Comment"]') ||
                           el.closest('[aria-label*="Share"]') ||
                           el.closest('[role="button"]') ||
                           el.closest('[aria-label*="תגובה"]');
        
        if (!isUIElement) {
          const text = el.textContent.trim();
          // Only add substantial text that's not already included
          if (text && text.length > 10 && !texts.some(t => t.includes(text))) {
            texts.push(text);
          }
        }
      });
    }
    
    // Remove duplicates and join
    fullText = [...new Set(texts)].join('\n');
    
    console.log(`Extracted text (${fullText.length} chars): ${fullText.substring(0, 100)}...`);

    // Get author name - look for profile link
    let author = '';
    
    // Method 1: Look for profile links with strong text
    const profileLinks = postElement.querySelectorAll('a[role="link"][href*="/user/"], a[role="link"][href*="/profile.php"]');
    for (const link of profileLinks) {
      const strongEl = link.querySelector('strong');
      if (strongEl && strongEl.textContent.trim()) {
        author = strongEl.textContent.trim();
        break;
      }
    }
    
    // Method 2: Look for author name in header area
    if (!author) {
      const headerArea = postElement.querySelector('h3, h4');
      if (headerArea) {
        const strongEl = headerArea.querySelector('strong');
        if (strongEl) {
          author = strongEl.textContent.trim();
        }
      }
    }

    // Get post time
    const timeElement = postElement.querySelector('a[role="link"] span, [data-testid="post_timestamp"]');
    const postTime = timeElement ? timeElement.textContent : '';
    
    console.log('Extracted post data:', {
      textLength: fullText.length,
      author: author,
      firstChars: fullText.substring(0, 50)
    });

    // Get images
    const images = [];
    const imageElements = postElement.querySelectorAll('img[referrerpolicy="origin-when-cross-origin"]');
    imageElements.forEach(img => {
      if (img.src && !img.src.includes('emoji') && img.width > 100) {
        images.push(img.src);
      }
    });

    // Get post URL
    const linkElements = postElement.querySelectorAll('a[href*="/groups/"][role="link"]');
    let postUrl = '';
    linkElements.forEach(link => {
      if (link.href.includes('posts/') || link.href.includes('permalink/')) {
        postUrl = link.href;
      }
    });

    // Extract phone numbers
    const phoneRegex = /(?:05\d[-\s]?\d{7}|05\d{8}|\+972[-\s]?5\d{1,2}[-\s]?\d{7})/g;
    const phones = fullText.match(phoneRegex) || [];

    // Extract price
    const priceRegex = /(?:₪|ש"ח|שח)\s*(\d{1,2},?\d{3})|(\d{1,2},?\d{3})\s*(?:₪|ש"ח|שח)/g;
    const priceMatches = fullText.match(priceRegex) || [];
    
    return {
      text: fullText.trim(),
      author,
      postTime,
      images,
      postUrl,
      phones: [...new Set(phones)],
      rawPrices: priceMatches,
      timestamp: new Date().toISOString()
    };
  }

  // Check if post is likely a rental listing (offering, not seeking)
  isRentalPost(postData) {
    const text = postData.text.toLowerCase();
    
    // Keywords indicating someone is OFFERING a rental
    const offerKeywords = [
      'להשכרה', 'להשכיר', 'פנויה', 'פנוי', 'כניסה מיידית',
      'דירת', 'דירה', 'חדרים', 'חד׳', 'סטודיו', 'יחידה'
    ];
    
    // Keywords indicating someone is LOOKING for a rental
    const seekingKeywords = [
      'מחפש', 'מחפשת', 'מחפשים', 'מחפשות',
      'מעוניין', 'מעוניינת', 'מעוניינים',
      'צריך', 'צריכה', 'זקוק', 'דרוש', 'דרושה'
    ];
    
    // Must have offer keywords OR be long enough with price
    const hasOfferKeyword = offerKeywords.some(keyword => text.includes(keyword));
    
    // Should NOT have seeking keywords (or they should appear after offer keywords)
    const hasSeeking = seekingKeywords.some(keyword => text.includes(keyword));
    
    // Additional checks for price mentions (strong indicator of offer)
    const hasPrice = /₪|ש"ח|שח|\d+,?\d{3}/.test(text);
    
    // More lenient check - if it has Hebrew and mentions numbers/price, consider it
    const isOffer = (hasOfferKeyword && !hasSeeking) || 
                    (hasPrice && text.length > 100 && !hasSeeking) ||
                    (hasOfferKeyword && hasPrice);
    
    // Debug logging
    console.log('Post analysis:', {
      text: text.substring(0, 100),
      hasOfferKeyword,
      hasSeeking,
      hasPrice,
      isOffer,
      author: postData.author
    });
    
    return isOffer;
  }

  // Expand all "See more" buttons
  async expandAllPosts() {
    const buttons = document.querySelectorAll('div[role="button"]');
    let expanded = 0;
    
    for (const button of buttons) {
      const text = button.textContent || '';
      if (text.match(/See more|עוד|הצג עוד|ראה עוד/)) {
        button.click();
        expanded++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return expanded;
  }

  // Scroll to load more posts
  async scrollToLoadPosts(maxScrolls = 5) {
    console.log('📜 Scrolling to load more posts...');
    let lastHeight = document.body.scrollHeight;
    let scrollCount = 0;
    
    while (scrollCount < maxScrolls) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        console.log('No more posts to load');
        break;
      }
      
      lastHeight = newHeight;
      scrollCount++;
      console.log(`Scroll ${scrollCount}: Loaded more posts (height: ${newHeight})`);
    }
    
    // Scroll back to top
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return scrollCount;
  }
  
  // Main extraction process
  async extract() {
    console.log('📜 Loading all posts...');
    const scrolls = await this.scrollToLoadPosts();
    console.log(`✅ Completed ${scrolls} scrolls`);
    
    console.log('🔄 Expanding posts...');
    const expanded = await this.expandAllPosts();
    console.log(`✅ Expanded ${expanded} posts`);
    
    console.log('📊 Extracting post data...');
    const posts = this.extractPosts();
    console.log(`✅ Found ${posts.length} rental posts`);
    
    return posts;
  }
}

// Create instance
const extractor = new FacebookPostExtractor();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  // Ping response
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return false;
  }
  
  if (request.action === 'extractPosts') {
    console.log('Starting full post extraction with scrolling...');
    
    // Use async function to handle the extraction
    (async () => {
      try {
        const posts = await extractor.extract();
        console.log('Extraction complete. Found posts:', posts.length);
        sendResponse({ posts: posts });
      } catch (error) {
        console.error('Error in extractPosts:', error);
        sendResponse({ error: error.message });
      }
    })();
    
    // Return true to indicate async response
    return true;
  }
  
  if (request.action === 'quickExtract') {
    // Quick extract without scrolling
    console.log('Quick extraction (no scrolling)...');
    try {
      const posts = extractor.extractPosts();
      console.log('Quick extraction complete. Found posts:', posts.length);
      sendResponse({ posts: posts });
    } catch (error) {
      console.error('Error in quickExtract:', error);
      sendResponse({ error: error.message });
    }
    return true;
  }
});

console.log('🚀 Domica content script loaded and ready!');

// Add visual indicator that script is loaded
const indicator = document.createElement('div');
indicator.textContent = 'Domica Extension Active';
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #2563EB;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 9999;
  font-family: Arial, sans-serif;
`;
document.body.appendChild(indicator);

// Remove indicator after 3 seconds
setTimeout(() => {
  indicator.remove();
}, 3000);