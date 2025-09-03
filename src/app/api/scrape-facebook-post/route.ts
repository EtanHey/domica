import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import FirecrawlApp from '@mendable/firecrawl-js';
import { Yad2ScraperFirecrawl } from '@/lib/scrapers/yad2-scraper-firecrawl';
import Browserbase from '@browserbasehq/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

// Supabase client - keeping for future use
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

// Helper function to extract Yad2 link from text
function extractYad2Link(text: string): string | null {
  const yad2Patterns = [
    /https?:\/\/(?:[\w-]+\.)?yad2\.co\.il(?:\/[^\s"'>),.?!\\]]*)?/gi,
    /(?:^|\b)(?:www\.)?yad2\.co\.il(?:\/[^\s"'>),.?!\\]]*)?/gi,
  ];
  
  for (const pattern of yad2Patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        let url = match.trim();
        // Remove trailing punctuation
        url = url.replace(/[,.!?;)\\]]+$/, '');
        
        // Make sure it's not just the domain
        if (url !== 'yad2.co.il' && url !== 'www.yad2.co.il') {
          // Ensure it has a proper path for properties
          try {
            if (!url.startsWith('http')) {
              url = 'https://' + url;
            }
            const urlObj = new URL(url);
            // Require at least a meaningful path
            if (urlObj.pathname.length > 1) {
              return url;
            }
          } catch (e) {
            // Skip invalid URLs
            continue;
          }
        }
      }
    }
  }
  
  return null;
}

// Helper function to scrape Yad2 property details using the dedicated Yad2 scraper
async function scrapeYad2Property(yad2Url: string) {
  try {
    console.log('Scraping Yad2 URL with dedicated scraper:', yad2Url);
    
    const yad2Scraper = new Yad2ScraperFirecrawl();
    const listing = await yad2Scraper.scrapeSingleListing(yad2Url);
    
    if (!listing) {
      console.log('No data returned from Yad2 scraper');
      return null;
    }

    // Convert the scraped listing to our property format
    const propertyInfo: any = {
      yad2Url: yad2Url,
      price: listing.price,
      rooms: listing.rooms,
      size: listing.size_sqm,
      city: listing.city,
      neighborhood: listing.neighborhood,
      street: listing.location,  // Using location field for street
      floor: listing.floor,
      amenities: listing.amenities || [],
      description: listing.description,
      images: listing.image_urls,
      propertyType: listing.property_type,
      contactPhone: listing.phone_number,
      contactName: listing.contact_name,
      listingType: listing.listing_type,
    };

    console.log('Extracted Yad2 property info:', propertyInfo);
    return propertyInfo;
  } catch (error) {
    console.error('Error scraping Yad2 with dedicated scraper:', error);
    return null;
  }
}

// Helper function to extract post ID from various Facebook URL formats
function extractPostId(url: string): string | null {
  // Handle share links: https://www.facebook.com/share/p/17AED63Dmv/
  const shareMatch = url.match(/facebook\.com\/share\/p\/([^\/\?]+)/);
  if (shareMatch) return shareMatch[1];

  // Handle permalink: https://www.facebook.com/permalink.php?story_fbid=...
  const permalinkMatch = url.match(/story_fbid=(\d+)/);
  if (permalinkMatch) return permalinkMatch[1];

  // Handle posts: https://www.facebook.com/groups/.../posts/...
  const postsMatch = url.match(/posts\/(\d+)/);
  if (postsMatch) return postsMatch[1];

  return null;
}

// Helper function to extract basic property info without AI
function extractBasicPropertyInfo(text: string) {
  const info: any = {
    price: null,
    rooms: null,
    city: null,
    neighborhood: null,
    street: null,
    floor: null,
    size: null,
    amenities: [],
    description: text.substring(0, 500),
    contactPhone: null,
  };

  // Extract price
  const pricePatterns = [
    /₪\s*(\d+(?:,\d+)?)/,
    /(\d+(?:,\d+)?)\s*₪/,
    /(\d+(?:,\d+)?)\s*(?:ש["']ח|שקל)/,
    /מחיר:?\s*(\d+(?:,\d+)?)/,
  ];
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      info.price = parseInt(match[1].replace(',', ''));
      break;
    }
  }

  // Extract rooms
  const roomPatterns = [
    /(\d+(?:\.\d+)?)\s*חדרים/,
    /דירת\s*(\d+(?:\.\d+)?)\s*חד/,
    /(\d+(?:\.\d+)?)\s*חד'/,
    /(\d+(?:\.\d+)?)\s*חדר/,
  ];
  for (const pattern of roomPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.rooms = parseFloat(match[1]);
      break;
    }
  }
  
  // Extract size (m²)
  const sizePatterns = [
    /(\d+)\s*מ"ר/,  // m"r
    /(\d+)\s*מטר/,  // meter
    /(\d+)\s*sqm/i,
    /(\d+)\s*m2/i,
  ];
  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match) {
      info.size = parseInt(match[1]);
      break;
    }
  }
  
  // Extract floor
  const floorPatterns = [
    /קומה\s*(\d+)/,  // koma X
    /(\d+)\s*מתוך\s*(\d+)/,  // X mitoch Y
  ];
  for (const pattern of floorPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.floor = parseInt(match[1]);
      break;
    }
  }

  // Extract city - expanded list
  const cities = [
    'תל אביב', 'ירושלים', 'חיפה', 'פתח תקווה', 'ראשון לציון', 'רמת גן', 'גבעתיים', 
    'הרצליה', 'רעננה', 'נתניה', 'באר יעקב', 'רחובות', 'נס ציונה', 'אשדוד', 'אשקלון',
    'בת ים', 'חולון', 'רמת השרון', 'כפר סבא', 'הוד השרון', 'ראש העין', 'יהוד', 'אור יהודה',
    'קרית אונו', 'גני תקווה', 'סביון', 'רמלה', 'לוד', 'מודיעין', 'בית שמש'
  ];
  for (const city of cities) {
    if (text.includes(city)) {
      info.city = city;
      break;
    }
  }

  // Extract phone - improved pattern
  const phonePatterns = [
    /05\d{1}[-\s]?\d{3}[-\s]?\d{4}/,
    /05\d{1}[-\s]?\d{7}/,
    /05\d[-\s]?\d{7}/,
    /05\d{8}/
  ];
  for (const pattern of phonePatterns) {
    const phoneMatch = text.match(pattern);
    if (phoneMatch) {
      info.contactPhone = phoneMatch[0].replace(/[-\s]/g, '');
      break;
    }
  }

  // Extract amenities - expanded list
  const amenityChecks = {
    'מעלית': ['מעלית'],
    'חניה': ['חניה', 'חנייה', 'חניות'],
    'מרפסת': ['מרפסת', 'מרפסות'],
    'ממ"ד': ['ממ"ד', 'ממד'],
    'מזגן': ['מזגן', 'מיזוג', 'מזגנים'],
    'מרוהט': ['מרוהט', 'ריהוט', 'מרוהטת'],
    'גינה': ['גינה', 'גן', 'חצר'],
    'מחסן': ['מחסן'],
    'דוד שמש': ['דוד שמש', 'דוד חשמלי'],
  };

  for (const [amenity, keywords] of Object.entries(amenityChecks)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      info.amenities.push(amenity);
    }
  }

  return info;
}

// Helper function to extract post content from HTML
function extractPostContent(html: string): string {
  // Try to extract the main post text from various possible selectors
  const patterns = [
    // Main post content patterns (use match instead of matchAll for better compatibility)
    /<div[^>]*data-ad-preview="message"[^>]*>([\s\S]*?)<\/div>/g,
    /<div[^>]*class="[^"]*userContent[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
    /<div[^>]*role="article"[^>]*>([\s\S]*?)<\/div>/g,
    // Look for Hebrew text patterns
    /([א-ת\s]+(?:חדר|דירה|להשכרה|מחיר|₪|\d+)[^<]*)/g,
    // Fallback to any text content
    /<div[^>]*>([\s\S]*?)<\/div>/g,
  ];

  let content = '';
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(html)) !== null) {
      const text = match[1]
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/&[^;]+;/g, ' ') // Remove HTML entities
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      if (
        text.length > 50 &&
        (text.includes('חדר') || text.includes('דירה') || text.includes('₪'))
      ) {
        content += text + '\n\n';
      }
    }
    if (content.length > 100) break;
  }

  return content || html.replace(/<[^>]*>/g, ' ').substring(0, 5000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, text } = body;

    // Input validation
    if (!url && !text) {
      return NextResponse.json(
        { success: false, error: 'Either URL or text is required' },
        { status: 400 }
      );
    }

    // Validate URL format if provided
    if (url) {
      try {
        const parsedUrl = new URL(url);
        // Only allow facebook.com and its subdomains
        const host = parsedUrl.hostname.toLowerCase();
        const isFb = host === 'facebook.com' || host.endsWith('.facebook.com');
        if (!isFb) {
          return NextResponse.json(
            { success: false, error: 'Only Facebook URLs are allowed' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Validate text length if provided
    if (text && text.length > 50000) {
      return NextResponse.json(
        { success: false, error: 'Text content too large (max 50000 characters)' },
        { status: 400 }
      );
    }

    // If text is provided directly, use it
    if (text && text.trim()) {
      console.log('Using provided text instead of scraping');
      
      // Check if there's a Yad2 link in the text
      const yad2Link = extractYad2Link(text);
      let yad2PropertyInfo = null;
      
      if (yad2Link) {
        console.log('Found Yad2 link in text:', yad2Link);
        yad2PropertyInfo = await scrapeYad2Property(yad2Link);
      }

      if (!anthropic) {
        return NextResponse.json({ error: 'Claude API not configured' }, { status: 500 });
      }

      const claudePrompt = `אתה עוזר AI המומחה בחילוץ מידע על דירות להשכרה מפוסטים בפייסבוק.

נתח את הטקסט הבא וחלץ את המידע על הדירה:

${text}

החזר את המידע בפורמט JSON עם השדות הבאים (השאר null אם המידע לא קיים):
{
  "price": number or null (מחיר חודשי),
  "rooms": number or null (מספר חדרים),
  "city": string or null (עיר),
  "neighborhood": string or null (שכונה),
  "street": string or null (רחוב),
  "floor": number or null (קומה),
  "size": number or null (גודל במ"ר),
  "availableFrom": string or null (תאריך כניסה בפורמט YYYY-MM-DD),
  "amenities": string[] (מאפיינים כמו: חניה, מעלית, מרפסת, וכו'),
  "description": string (תיאור כללי של הדירה),
  "contactPhone": string or null (טלפון ליצירת קשר),
  "contactName": string or null (שם איש קשר)
}

חשוב:
- חלץ רק מידע שקיים בטקסט
- המרת ערכים: "חדר וחצי" = 1.5, "שני חדרים" = 2, וכו'
- נרמל מספרי טלפון לפורמט: 05XXXXXXXX
- אם המחיר כולל ביטויים כמו "כולל ארנונה" או "לא כולל חשבונות", ציין זאת בתיאור

החזר רק את ה-JSON, ללא טקסט נוסף.`;

      try {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: claudePrompt,
            },
          ],
        });

        const content = response.content?.[0];
        if (content && content.type === 'text') {
          const cleanedJson = content.text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

          const extractedData = JSON.parse(cleanedJson);
          console.log('Claude extracted data:', extractedData);

          // Merge data from Facebook and Yad2 if available
          const mergedData = yad2PropertyInfo ? {
            ...extractedData,
            price: yad2PropertyInfo.price ?? extractedData.price,
            rooms: yad2PropertyInfo.rooms ?? extractedData.rooms,
            size: yad2PropertyInfo.size ?? extractedData.size,
            city: yad2PropertyInfo.city ?? extractedData.city,
            neighborhood: yad2PropertyInfo.neighborhood ?? extractedData.neighborhood,
            street: yad2PropertyInfo.street ?? extractedData.street,
            floor: yad2PropertyInfo.floor ?? extractedData.floor,
            amenities: [...new Set([...(extractedData.amenities || []), ...(yad2PropertyInfo.amenities || [])])],
            description: (extractedData.description ?? '') + (yad2PropertyInfo.description ? '\n\n[מידע נוסף מיד2]\n' + yad2PropertyInfo.description : ''),
            yad2Url: yad2PropertyInfo?.yad2Url,
            images: yad2PropertyInfo?.images ?? extractedData.images,
            propertyType: yad2PropertyInfo?.propertyType ?? extractedData.propertyType,
            listingType: yad2PropertyInfo?.listingType ?? extractedData.listingType,
            contactPhone: yad2PropertyInfo?.contactPhone ?? extractedData.contactPhone,
            contactName: yad2PropertyInfo?.contactName ?? extractedData.contactName,
          } : extractedData;
          
          // Format the response
          const property = {
            title:
              `דירת ${mergedData.rooms || ''} חדרים ${mergedData.neighborhood ? 'ב' + mergedData.neighborhood : ''} ${mergedData.city || ''}`.trim(),
            pricePerMonth: mergedData.price?.toString() || '0',
            currency: 'ILS',
            bedrooms: mergedData.rooms ? Math.floor(mergedData.rooms) : null,
            size: mergedData.size,
            city: mergedData.city,
            neighborhood: mergedData.neighborhood,
            street: mergedData.street,
            floor: mergedData.floor,
            availableFrom: mergedData.availableFrom,
            amenities: mergedData.amenities || [],
            description: mergedData.description || text.substring(0, 500),
            contactPhone: mergedData.contactPhone,
            contactName: mergedData.contactName,
            sourceUrl: url || 'manual-input',
            sourcePlatform: 'facebook',
            yad2Url: mergedData.yad2Url,
          };

          return NextResponse.json({
            success: true,
            property,
            debug: {
              method: 'manual-text',
              contentLength: text.length,
              extractedFields: Object.keys(mergedData).filter((k) => mergedData[k] != null)
                .length,
              yad2Scraped: !!yad2PropertyInfo,
            },
          });
        }
      } catch (error: any) {
        console.error('Claude parsing error:', error);
        
        // Check if it's a credit balance error
        if (error.status === 400 && error.message?.includes('credit balance')) {
          // Try basic extraction without AI
          const basicInfo = extractBasicPropertyInfo(text);
          
          if (basicInfo.price || basicInfo.rooms) {
            const property = {
              title: `דירת ${basicInfo.rooms || ''} חדרים ${basicInfo.city ? 'ב' + basicInfo.city : ''}`.trim() || 'דירה להשכרה',
              pricePerMonth: basicInfo.price?.toString() || '0',
              currency: 'ILS',
              bedrooms: basicInfo.rooms ? Math.floor(basicInfo.rooms) : null,
              size: basicInfo.size,
              city: basicInfo.city,
              neighborhood: basicInfo.neighborhood,
              street: basicInfo.street,
              floor: basicInfo.floor,
              amenities: basicInfo.amenities || [],
              description: basicInfo.description,
              contactPhone: basicInfo.contactPhone,
              sourceUrl: url || 'manual-input',
              sourcePlatform: 'facebook',
            };
            
            return NextResponse.json({
              success: true,
              property,
              debug: {
                method: 'basic-extraction',
                contentLength: text.length,
                extractedFields: Object.keys(basicInfo).filter(k => basicInfo[k] != null && (Array.isArray(basicInfo[k]) ? basicInfo[k].length > 0 : true)).length,
                note: 'שימוש בחילוץ בסיסי עקב מגבלת API',
                yad2Scraped: !!yad2PropertyInfo
              },
            });
          }
          
          return NextResponse.json({
            success: false,
            error: 'שירות הניתוח אינו זמין כרגע (חריגת מכסה)',
            suggestion: 'נסה שוב מאוחר יותר או פנה למנהל המערכת',
            fallbackData: {
              description: text.substring(0, 1000),
              sourceUrl: url || 'manual-input',
            },
          });
        }
        
        return NextResponse.json({
          success: false,
          error: 'Failed to parse with AI',
          fallbackData: {
            description: text.substring(0, 1000),
            sourceUrl: url || 'manual-input',
          },
        });
      }
    }

    if (!url || !url.includes('facebook.com')) {
      return NextResponse.json({ error: 'Invalid Facebook URL' }, { status: 400 });
    }

    console.log('Scraping Facebook post:', url);

    // Extract post ID for potential API use
    const postId = extractPostId(url);
    console.log('Extracted post ID:', postId);
    
    // First, try to scrape the Facebook post with Firecrawl
    let postContent = '';
    let postHtml = '';
    let yad2PropertyInfo = null;
    
    if (firecrawl) {
      try {
        console.log('Trying Firecrawl for Facebook scraping...');
        const fbScrapeResult = await firecrawl.scrapeUrl(url, {
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 3000,
        });
        
        if (fbScrapeResult && fbScrapeResult.success) {
          postContent = fbScrapeResult.markdown || '';
          postHtml = fbScrapeResult.html || '';
          console.log('Firecrawl Facebook scraping successful, content length:', postContent.length);
          
          // Check for Yad2 link in the scraped content
          const yad2Link = extractYad2Link(postContent + ' ' + postHtml);
          if (yad2Link) {
            console.log('Found Yad2 link:', yad2Link);
            yad2PropertyInfo = await scrapeYad2Property(yad2Link);
          }
        }
      } catch (error) {
        console.error('Firecrawl Facebook scraping error:', error);
      }
    }

    // Try Browserbase for production or regular Playwright for development
    let browser = null;
    let page = null;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    
    try {
      if (isProduction && process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID) {
        // Use Browserbase in production
        console.log('Using Browserbase for scraping...');
        const bb = new Browserbase({
          apiKey: process.env.BROWSERBASE_API_KEY,
        });
        
        const session = await bb.sessions.create({
          projectId: process.env.BROWSERBASE_PROJECT_ID,
        });
        
        const playwright = await import('playwright-core');
        browser = await playwright.chromium.connectOverCDP(session.connectUrl);
        const context = browser.contexts()[0];
        page = context.pages()[0];
      } else {
        // Use local Playwright in development
        const playwright = await import('playwright').catch(() => null);
        
        if (playwright) {
          console.log('Using local Playwright for scraping...');
          const args = process.env.NODE_ENV === 'development' 
            ? ['--no-sandbox', '--disable-setuid-sandbox']
            : ['--disable-dev-shm-usage'];
          
          browser = await playwright.chromium.launch({
            headless: true,
            args,
          });
        
          const context = await browser.newContext({
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          });
          page = await context.newPage();
        }
      }
      
      if (page) {
        try {

          // Navigate to the URL
          await page.goto(url, { waitUntil: 'networkidle' });

          // Wait for content to load
          await page.waitForTimeout(3000);

          // Try to extract the post content and Yad2 links
          const extractionResult = await page.evaluate(() => {
          // Look for post content in various selectors
          const selectors = [
            '[data-ad-preview="message"]',
            '[role="article"]',
            '.userContent',
            'div[dir="rtl"]',
            'span[dir="rtl"]',
          ];

          let content = '';
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent && element.textContent.length > 50) {
              content = element.textContent;
              break;
            }
          }

          // Fallback: get all text if no specific selector worked
          if (!content) {
            content = document.body.innerText;
          }

          // Look for Yad2 links in the page
          const yad2Links: string[] = [];
          
          // Check all anchor tags for Yad2 links
          const allLinks = document.querySelectorAll('a');
          allLinks.forEach(link => {
            const href = link.href;
            if (href && href.includes('yad2.co.il')) {
              yad2Links.push(href);
            }
          });

          // Also check for Yad2 URLs in text content
          const yad2Pattern = /https?:\/\/(?:www\.)?yad2\.co\.il\/[^\s,]+/gi;
          const textMatches = content.match(yad2Pattern);
          if (textMatches) {
            yad2Links.push(...textMatches);
          }

          // Remove duplicates
          const uniqueLinks = [...new Set(yad2Links)];

          return {
            content,
            yad2Links: uniqueLinks
          };
        });

          postContent = extractionResult.content;
          console.log('Playwright scraping successful, content length:', postContent.length);
          console.log('Scraped content preview:', postContent.substring(0, 200));
        
        // Check for Yad2 links from Playwright extraction
        if (!yad2PropertyInfo && extractionResult.yad2Links && extractionResult.yad2Links.length > 0) {
          console.log('Found Yad2 links via Playwright DOM:', extractionResult.yad2Links);
          // Try to scrape the first valid Yad2 property link
          for (let yad2Link of extractionResult.yad2Links) {
            // Handle Facebook redirect URLs
            if (yad2Link.includes('l.facebook.com/l.php')) {
              // Extract the actual URL from Facebook's redirect
              const urlMatch = yad2Link.match(/[?&]u=([^&]+)/);
              if (urlMatch) {
                yad2Link = decodeURIComponent(urlMatch[1]);
                console.log('Extracted actual Yad2 URL from Facebook redirect:', yad2Link);
              }
            }
            
            // Skip if it's just the homepage or a general category page
            if (yad2Link.includes('/item/') || (yad2Link.includes('/realestate/') && yad2Link.includes('yad2.co.il'))) {
              console.log('Attempting to scrape Yad2 property:', yad2Link);
              yad2PropertyInfo = await scrapeYad2Property(yad2Link);
              if (yad2PropertyInfo) {
                break;
              }
            }
          }
        }
        
        // Fallback: Check for Yad2 link in text content if not found in DOM
        if (!yad2PropertyInfo) {
          const yad2Link = extractYad2Link(postContent);
          if (yad2Link) {
            console.log('Found Yad2 link via text extraction:', yad2Link);
            yad2PropertyInfo = await scrapeYad2Property(yad2Link);
          }
        }
        } catch (innerError) {
          console.error('Page extraction error:', innerError);
        }
      }
    } catch (error) {
      console.error('Browser automation error:', error);
    } finally {
      // Ensure browser is always closed to prevent resource leaks
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }

    // Method 3: Try using a proxy service
    if (!postContent) {
      try {
        // You could use services like:
        // - ProxyCrawl: https://proxycrawl.com/
        // - Bright Data: https://brightdata.com/
        const proxyUrl = process.env.PROXY_SERVICE_URL;
        if (proxyUrl) {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });

          if (response.ok) {
            const data = await response.json();
            postContent = data.content || '';
            console.log('Proxy scraping successful');
          }
        }
      } catch (error) {
        console.error('Proxy error:', error);
      }
    }

    // Method 4: Direct fetch (usually blocked by Facebook)
    if (!postContent && !postHtml) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        });

        if (response.ok) {
          postHtml = await response.text();
          postContent = extractPostContent(postHtml);
          console.log('Direct fetch successful');
        }
      } catch (error) {
        console.error('Direct fetch error:', error);
      }
    }

    if (!postContent && postHtml) {
      postContent = extractPostContent(postHtml);
    }

    if (!postContent) {
      return NextResponse.json(
        {
          error: 'לא הצלחנו לחלץ את תוכן הפוסט. פייסבוק חוסם גישה אוטומטית.',
          suggestion: 'נסה להעתיק את הטקסט של הפוסט ולהדביק אותו ישירות',
          postId,
        },
        { status: 500 }
      );
    }

    console.log('Extracted content length:', postContent.length);

    // Use Claude to parse the content
    if (!anthropic) {
      return NextResponse.json({ error: 'Claude API not configured' }, { status: 500 });
    }

    const claudePrompt = `אתה עוזר AI המומחה בחילוץ מידע על דירות להשכרה מפוסטים בפייסבוק.

נתח את הטקסט הבא וחלץ את המידע על הדירה:

${postContent}

החזר את המידע בפורמט JSON עם השדות הבאים (השאר null אם המידע לא קיים):
{
  "price": number or null (מחיר חודשי),
  "rooms": number or null (מספר חדרים),
  "city": string or null (עיר),
  "neighborhood": string or null (שכונה),
  "street": string or null (רחוב),
  "floor": number or null (קומה),
  "size": number or null (גודל במ"ר),
  "availableFrom": string or null (תאריך כניסה בפורמט YYYY-MM-DD),
  "amenities": string[] (מאפיינים כמו: חניה, מעלית, מרפסת, וכו'),
  "description": string (תיאור כללי של הדירה),
  "contactPhone": string or null (טלפון ליצירת קשר),
  "contactName": string or null (שם איש קשר)
}

חשוב:
- חלץ רק מידע שקיים בטקסט
- המרת ערכים: "חדר וחצי" = 1.5, "שני חדרים" = 2, וכו'
- נרמל מספרי טלפון לפורמט: 05XXXXXXXX
- אם המחיר כולל ביטויים כמו "כולל ארנונה" או "לא כולל חשבונות", ציין זאת בתיאור

החזר רק את ה-JSON, ללא טקסט נוסף.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: claudePrompt,
          },
        ],
      });

      const content = response.content?.[0];
      if (content && content.type === 'text') {
        const cleanedJson = content.text
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const extractedData = JSON.parse(cleanedJson);
        console.log('Claude extracted data:', extractedData);

        // Merge data from Facebook and Yad2 if available
        const mergedData = yad2PropertyInfo ? {
          ...extractedData,
          price: yad2PropertyInfo.price ?? extractedData.price,
          rooms: yad2PropertyInfo.rooms ?? extractedData.rooms,
          size: yad2PropertyInfo.size ?? extractedData.size,
          city: yad2PropertyInfo.city ?? extractedData.city,
          neighborhood: yad2PropertyInfo.neighborhood ?? extractedData.neighborhood,
          street: yad2PropertyInfo.street ?? extractedData.street,
          floor: yad2PropertyInfo.floor ?? extractedData.floor,
          amenities: [...new Set([...(extractedData.amenities || []), ...(yad2PropertyInfo.amenities || [])])],
          description: (extractedData.description ?? '') + (yad2PropertyInfo.description ? '\n\n[מידע נוסף מיד2]\n' + yad2PropertyInfo.description : ''),
          yad2Url: yad2PropertyInfo?.yad2Url,
        } : extractedData;
        
        // Format the response
        const property = {
          title:
            `דירת ${mergedData.rooms || ''} חדרים ${mergedData.neighborhood ? 'ב' + mergedData.neighborhood : ''} ${mergedData.city || ''}`.trim(),
          pricePerMonth: mergedData.price?.toString() || '0',
          currency: 'ILS',
          bedrooms: mergedData.rooms ? Math.floor(mergedData.rooms) : null,
          size: mergedData.size,
          city: mergedData.city,
          neighborhood: mergedData.neighborhood,
          street: mergedData.street,
          floor: mergedData.floor,
          availableFrom: mergedData.availableFrom,
          amenities: mergedData.amenities || [],
          description: mergedData.description || postContent.substring(0, 500),
          contactPhone: mergedData.contactPhone,
          contactName: mergedData.contactName,
          sourceUrl: url,
          sourcePlatform: 'facebook',
          yad2Url: mergedData.yad2Url,
          images: (yad2PropertyInfo?.images || extractedData.images) ?? [],
        };

        return NextResponse.json({
          success: true,
          property,
          debug: {
            method: 'scraped',
            contentLength: postContent.length,
            extractedFields: Object.keys(mergedData).filter((k) => mergedData[k] != null)
              .length,
            yad2Scraped: !!yad2PropertyInfo,
          },
        });
      }
    } catch (error: any) {
      console.error('Claude parsing error:', error);
      console.log('Falling back to basic extraction for content:', postContent.substring(0, 200));

      // Check if it's a credit balance error
      if (error.status === 400 && error.message?.includes('credit balance')) {
        // Try basic extraction without AI
        const basicInfo = extractBasicPropertyInfo(postContent);
        
        // Merge with Yad2 data if available
        if (yad2PropertyInfo) {
          basicInfo.price = yad2PropertyInfo.price || basicInfo.price;
          basicInfo.rooms = yad2PropertyInfo.rooms || basicInfo.rooms;
          basicInfo.size = yad2PropertyInfo.size || basicInfo.size;
          basicInfo.city = yad2PropertyInfo.city || basicInfo.city;
          basicInfo.neighborhood = yad2PropertyInfo.neighborhood || basicInfo.neighborhood;
          basicInfo.street = yad2PropertyInfo.street || basicInfo.street;
          basicInfo.floor = yad2PropertyInfo.floor || basicInfo.floor;
          basicInfo.amenities = [...new Set([...basicInfo.amenities, ...(yad2PropertyInfo.amenities || [])])];
          basicInfo.description = basicInfo.description + (yad2PropertyInfo ? '\n\n[מידע מיד2]\n' + yad2PropertyInfo.description : '');
        }
        
        if (basicInfo.price || basicInfo.rooms) {
          const property = {
            title: `דירת ${basicInfo.rooms || ''} חדרים ${basicInfo.city ? 'ב' + basicInfo.city : ''}`.trim() || 'דירה להשכרה',
            pricePerMonth: basicInfo.price?.toString() || '0',
            currency: 'ILS',
            bedrooms: basicInfo.rooms ? Math.floor(basicInfo.rooms) : null,
            size: basicInfo.size,
            city: basicInfo.city,
            neighborhood: basicInfo.neighborhood,
            street: basicInfo.street,
            floor: basicInfo.floor,
            amenities: basicInfo.amenities || [],
            description: basicInfo.description,
            contactPhone: basicInfo.contactPhone,
            sourceUrl: url,
            sourcePlatform: 'facebook',
            yad2Url: yad2PropertyInfo?.yad2Url,
          };
          
          return NextResponse.json({
            success: true,
            property,
            debug: {
              method: 'basic-extraction',
              contentLength: postContent.length,
              extractedFields: Object.keys(basicInfo).filter(k => basicInfo[k] != null && (Array.isArray(basicInfo[k]) ? basicInfo[k].length > 0 : true)).length,
              yad2Scraped: !!yad2PropertyInfo,
            },
          });
        }
        
        return NextResponse.json({
          success: false,
          error: 'שירות הניתוח אינו זמין כרגע (חריגת מכסה)',
          suggestion: 'העתק את הטקסט של הפוסט מפייסבוק והדבק בטאב "הדבקת טקסט"',
          fallbackData: {
            description: postContent.substring(0, 1000),
            sourceUrl: url,
          },
        });
      }

      // Fallback: Return basic extraction
      return NextResponse.json({
        success: false,
        error: 'Failed to parse with AI',
        fallbackData: {
          description: postContent.substring(0, 1000),
          sourceUrl: url,
        },
      });
    }
  } catch (error: any) {
    console.error('API error:', error);
    
    // Sanitize error messages for production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment
      ? error.message || 'Failed to scrape post'
      : 'An error occurred while processing your request';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
