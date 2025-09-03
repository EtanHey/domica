// Facebook Group Post Extractor V2 - More aggressive approach
class FacebookPostExtractorV2 {
  constructor() {
    this.posts = [];
  }

  // Extract all posts from the page
  extractPosts() {
    domicaLog('🔍 Starting aggressive post extraction...');
    console.log('🔍 Starting aggressive post extraction...');

    const posts = [];
    const seenTexts = new Set();

    // Strategy: Find all articles in the feed
    const articles = document.querySelectorAll('[role="feed"] [role="article"]');
    domicaLog(`📰 Found ${articles.length} article elements`);
    console.log(`📰 Found ${articles.length} article elements`);

    if (articles.length === 0) {
      domicaLog('❌ No articles found in feed!');
      return posts;
    }

    // Process each article
    let processedCount = 0;

    articles.forEach((article, index) => {
      try {
        processedCount++;

        // Extract all text from this article
        const textElements = article.querySelectorAll('div[dir="auto"], span[dir="auto"]');
        const texts = [];

        textElements.forEach((el) => {
          const text = el.textContent.trim();
          if (text && text.length > 20 && !texts.includes(text)) {
            texts.push(text);
          }
        });

        const fullText = texts.join('\n');

        // Skip if no substantial text
        if (!fullText || fullText.length < 50) {
          return;
        }

        // Skip if no Hebrew
        if (!fullText.match(/[\u05d0-\u05ea]/)) {
          return;
        }

        // Check for duplicates
        const textKey = fullText.substring(0, 100);
        if (seenTexts.has(textKey)) {
          return;
        }
        seenTexts.add(textKey);

        // Extract post data
        const postData = {
          text: fullText,
          author: this.extractAuthor(article),
          images: this.extractImages(article),
          timestamp: new Date().toISOString(),
          index: index,
        };

        // Log what we found
        const isRental = this.isRentalOffer(postData.text);
        console.log(`📝 Post ${index}:`, {
          author: postData.author,
          textLength: postData.text.length,
          preview: postData.text.substring(0, 100) + '...',
          isRental: isRental,
        });

        // Add all posts for now to see what we're getting
        posts.push(postData);
        if (isRental) {
          console.log(`✅ Added as rental offer #${posts.length}`);
        } else {
          console.log(`⚠️ Added but not classified as rental offer`);
        }
      } catch (error) {
        console.error(`Error processing container ${index}:`, error);
      }
    });

    domicaLog(`📊 Processed ${processedCount} articles`);
    domicaLog(`🏁 Extraction complete: ${posts.length} posts found`);
    console.log(`🏁 Extraction complete: ${posts.length} posts found`);
    return posts;
  }

  // Extract author name
  extractAuthor(container) {
    // Look for strong tags in links (usually the author name)
    const authorElement = container.querySelector('a[role="link"] strong');
    if (authorElement) {
      return authorElement.textContent.trim();
    }

    // Fallback: first strong tag
    const strongElement = container.querySelector('strong');
    return strongElement ? strongElement.textContent.trim() : 'Unknown';
  }

  // Extract images
  extractImages(container) {
    const images = [];
    const imgElements = container.querySelectorAll('img');

    imgElements.forEach((img) => {
      if (img.src && !img.src.includes('emoji') && !img.src.includes('static') && img.width > 100) {
        images.push(img.src);
      }
    });

    return images;
  }

  // Check if post is offering a rental (not looking for one)
  isRentalOffer(text) {
    const lowerText = text.toLowerCase();

    // IMMEDIATE DISQUALIFIERS - if any of these appear, it's NOT an offer
    const seekingKeywords = [
      'מחפש',
      'מחפשת',
      'מחפשים',
      'מחפשות',
      'מעוניין',
      'מעוניינת',
      'מעוניינים',
      'מעוניינות',
      'דרוש',
      'דרושה',
      'דרושים',
      'דרושות',
      'צריך',
      'צריכה',
      'צריכים',
      'צריכות',
      'רוצה',
      'רוצים',
      'רוצות',
      'זקוק',
      'זקוקה',
      'זקוקים',
      'חייל בודד',
      'סטודנט מחפש',
      'סטודנטית מחפשת',
      'looking for',
      'need',
      'want',
      'searching',
    ];

    // Check for seeking keywords FIRST
    for (const keyword of seekingKeywords) {
      if (lowerText.includes(keyword)) {
        console.log(`❌ Rejected: Contains seeking keyword "${keyword}"`);
        return false; // Immediately reject
      }
    }

    // Keywords that indicate OFFERING a rental
    const offerKeywords = [
      'להשכרה',
      'להשכיר',
      'משכיר',
      'משכירה',
      'משכירים',
      'פנויה',
      'פנוי',
      'פנויים',
      'מושכרת',
      'כניסה מיידית',
      'כניסה ב',
      'כניסה החל מ',
      'לתקופה ארוכה',
      'לתקופה קצרה',
    ];

    // Must have at least one offer keyword
    let hasOfferKeyword = false;
    for (const keyword of offerKeywords) {
      if (lowerText.includes(keyword)) {
        hasOfferKeyword = true;
        break;
      }
    }

    if (!hasOfferKeyword) {
      console.log('❌ Rejected: No offer keywords found');
      return false;
    }

    // Additional positive indicators
    const hasPrice = /₪|ש"ח|שח|\d{3,4}/.test(text);
    const hasRooms = /\d\s*חדרים|\d\s*חד|\d\.5/.test(text);

    console.log(`✅ Accepted as offer: hasPrice=${hasPrice}, hasRooms=${hasRooms}`);
    return true;
  }

  // Scroll to load more posts
  async scrollToLoadPosts(maxScrolls = 3) {
    domicaLog('📜 Scrolling to load more posts...');
    console.log('📜 Scrolling to load more posts...');
    let lastHeight = document.body.scrollHeight;
    let scrollCount = 0;

    while (scrollCount < maxScrolls) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        domicaLog('📏 No more posts to load');
        console.log('No more posts to load');
        break;
      }

      lastHeight = newHeight;
      scrollCount++;
      domicaLog(`📜 Scroll ${scrollCount}: New height ${newHeight}`);
      console.log(`Scroll ${scrollCount}: New height ${newHeight}`);
    }

    return scrollCount;
  }

  // Main extraction with scrolling
  async extract() {
    try {
      domicaLog('🚀 Starting full extraction process...');
      console.log('🚀 Starting full extraction process...');

      // Scroll to load posts
      domicaLog('📜 About to start scrolling...');
      const scrolls = await this.scrollToLoadPosts();
      domicaLog(`✅ Completed ${scrolls} scrolls`);
      console.log(`✅ Completed ${scrolls} scrolls`);

      // Wait a bit for content to settle
      domicaLog('⏳ Waiting for content to settle...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Extract posts
      domicaLog('📊 Now extracting posts...');
      let posts = [];
      try {
        posts = this.extractPosts();
      } catch (extractError) {
        domicaLog(`❌ Error during extraction: ${extractError.message}`);
        console.error('Extraction error:', extractError);
        // Return empty array instead of throwing
        return [];
      }

      domicaLog(`📋 Returning ${posts.length} posts`);
      return posts;
    } catch (error) {
      domicaLog(`❌ Extract error: ${error.message}`);
      console.error('Extract error:', error);
      throw error;
    }
  }
}

// Create instance and make it globally accessible for debugging
const extractorV2 = new FacebookPostExtractorV2();
window.extractorV2 = extractorV2;

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content script received:', request.action);

  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return false;
  }

  if (request.action === 'extractPosts') {
    domicaLog('📩 Received extractPosts request');

    // Set a timeout to ensure we respond
    const timeoutId = setTimeout(() => {
      domicaLog('⏰ Timeout reached, sending empty response');
      sendResponse({ posts: [] });
    }, 20000); // 20 second timeout

    (async () => {
      try {
        domicaLog('🏃 Running extraction...');
        const posts = await extractorV2.extract();
        clearTimeout(timeoutId); // Clear timeout if we succeed
        domicaLog(`✉️ Sending response with ${posts.length} posts`);
        sendResponse({ posts: posts });
      } catch (error) {
        clearTimeout(timeoutId); // Clear timeout
        domicaLog(`❌ Extraction error: ${error.message}`);
        console.error('Extraction error:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});

console.log('🚀 Domica V2 content script loaded!');
console.warn('Domica V2 is active - this should appear even with filters');
console.info("Check console filter settings if you don't see logs");

// Debug panel for logging
const debugPanel = document.createElement('div');
debugPanel.id = 'domica-debug';
debugPanel.style.cssText = `
  position: fixed;
  bottom: 10px;
  right: 10px;
  width: 400px;
  max-height: 300px;
  background: rgba(0, 0, 0, 0.9);
  color: #10b981;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  z-index: 9999;
  font-family: monospace;
  overflow-y: auto;
  display: none;
`;
document.body.appendChild(debugPanel);

// Custom log function
function domicaLog(message) {
  console.log(message);
  const entry = document.createElement('div');
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  entry.style.marginBottom = '5px';
  debugPanel.appendChild(entry);
  debugPanel.style.display = 'block';
  debugPanel.scrollTop = debugPanel.scrollHeight;
}

// Override console.log for our script
const originalLog = console.log;
console.log = function (...args) {
  originalLog(...args);
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('🔍') ||
      args[0].includes('📦') ||
      args[0].includes('✅') ||
      args[0].includes('❌'))
  ) {
    domicaLog(args.join(' '));
  }
};

// Visual indicator
const indicator = document.createElement('div');
indicator.textContent = 'Domica V2 Active (Click for debug)';
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  background: #10b981;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  z-index: 9999;
  font-family: Arial, sans-serif;
  cursor: pointer;
`;
indicator.onclick = () => {
  debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
};
document.body.appendChild(indicator);

domicaLog('Domica V2 initialized');
