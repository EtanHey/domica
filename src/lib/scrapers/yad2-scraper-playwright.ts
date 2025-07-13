import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { ScrapedListing } from './base-scraper';

export class Yad2ScraperPlaywright {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor() {}

  async initialize() {
    console.log('🚀 Initializing ULTRA-STEALTH Playwright scraper...');
    
    try {
      // Launch browser with MAXIMUM stealth configuration
      this.browser = await chromium.launch({
        headless: true, // Keep headless for production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images', // Faster loading
          '--aggressive-cache-discard',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ]
      });

      // Create context with ISRAELI user simulation
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'he-IL',
        timezoneId: 'Asia/Jerusalem',
        geolocation: { longitude: 34.7818, latitude: 32.0853 }, // Tel Aviv coordinates
        permissions: ['geolocation'],
        extraHTTPHeaders: {
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      console.log('✅ Ultra-stealth browser initialized');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  /**
   * NUCLEAR OPTION: Ultra-aggressive single listing scraper
   */
  async scrapeSingleListing(url: string): Promise<ScrapedListing | null> {
    if (!this.context) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`🎯 ULTRA-STEALTH scraping: ${url}`);

      // Block unnecessary resources for speed
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Navigate with human-like behavior
      console.log('🚶 Human-like navigation...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Wait for potential dynamic content
      await page.waitForTimeout(2000 + Math.random() * 1000);

      // Check for CAPTCHA
      const captchaSelectors = [
        'iframe[src*="hcaptcha"]',
        'iframe[src*="recaptcha"]',
        'div[class*="captcha"]',
        'div[class*="challenge"]',
        'text=Are you for real',
        'text=אני אנושי'
      ];

      for (const selector of captchaSelectors) {
        const captcha = await page.locator(selector).first();
        if (await captcha.isVisible()) {
          console.log('🤖 CAPTCHA detected, attempting bypass...');
          
          // Try to find and click "I'm human" button
          const humanButtons = [
            'text=אני אנושי',
            'button:has-text("אני אנושי")',
            'input[type="checkbox"]',
            '.checkbox',
            '[role="checkbox"]'
          ];

          for (const buttonSelector of humanButtons) {
            try {
              const button = page.locator(buttonSelector).first();
              if (await button.isVisible()) {
                console.log('🔘 Clicking human verification...');
                
                // Human-like click with delay
                await page.mouse.move(
                  Math.random() * 100 + 100, 
                  Math.random() * 100 + 100
                );
                await page.waitForTimeout(500 + Math.random() * 500);
                await button.click();
                await page.waitForTimeout(2000 + Math.random() * 1000);
                break;
              }
            } catch (e) {
              console.log(`Couldn't click ${buttonSelector}`);
            }
          }
        }
      }

      // Check if we got blocked
      const pageContent = await page.content();
      if (pageContent.includes('Are you for real') || 
          pageContent.includes('אני אנושי') ||
          pageContent.includes('hCaptcha') ||
          pageContent.includes('Access Denied')) {
        console.log('⚠️ Page blocked by anti-bot protection');
        return null;
      }

      // Extract data using multiple strategies
      console.log('📊 Extracting property data...');
      
      const listing = await this.extractListingData(page, url);
      
      if (listing) {
        console.log(`✅ ULTRA-STEALTH success: ${listing.title.substring(0, 50)}...`);
      }
      
      return listing;

    } catch (error) {
      console.error('❌ ULTRA-STEALTH scraping failed:', error);
      return null;
    } finally {
      await page.close();
    }
  }

  /**
   * ULTRA-AGGRESSIVE data extraction with multiple fallback strategies
   */
  private async extractListingData(page: Page, url: string): Promise<ScrapedListing | null> {
    try {
      // Strategy 1: JSON-LD structured data
      const jsonLd = await this.extractJsonLd(page);
      if (jsonLd) {
        console.log('📋 Using JSON-LD structured data');
        return jsonLd;
      }

      // Strategy 2: Meta tags
      const metaData = await this.extractMetaTags(page);
      if (metaData) {
        console.log('🏷️ Using meta tag data');
        return metaData;
      }

      // Strategy 3: DOM scraping with multiple selectors
      const domData = await this.extractFromDOM(page, url);
      if (domData) {
        console.log('🔍 Using DOM extraction');
        return domData;
      }

      // Strategy 4: Text pattern matching
      const textData = await this.extractFromText(page, url);
      if (textData) {
        console.log('📝 Using text pattern matching');
        return textData;
      }

      console.log('❌ All extraction strategies failed');
      return null;

    } catch (error) {
      console.error('Error in data extraction:', error);
      return null;
    }
  }

  private async extractJsonLd(page: Page): Promise<ScrapedListing | null> {
    try {
      const jsonLdData = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            if (data['@type'] === 'RealEstate' || data['@type'] === 'Product' || data.name || data.price) {
              return data;
            }
          } catch (e) {
            // Continue to next script
          }
        }
        return null;
      });

      if (jsonLdData) {
        return this.convertJsonLdToListing(jsonLdData, await page.url());
      }
    } catch (error) {
      console.error('JSON-LD extraction failed:', error);
    }
    return null;
  }

  private async extractMetaTags(page: Page): Promise<ScrapedListing | null> {
    try {
      const metaData = await page.evaluate(() => {
        const getMeta = (name: string) => {
          const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement;
          return meta?.content || '';
        };

        return {
          title: getMeta('og:title') || getMeta('title') || document.title,
          description: getMeta('og:description') || getMeta('description'),
          image: getMeta('og:image'),
          price: getMeta('product:price:amount') || getMeta('price'),
          currency: getMeta('product:price:currency'),
          url: getMeta('og:url') || window.location.href
        };
      });

      if (metaData.title && (metaData.price || metaData.description)) {
        return this.convertMetaToListing(metaData, await page.url());
      }
    } catch (error) {
      console.error('Meta tag extraction failed:', error);
    }
    return null;
  }

  private async extractFromDOM(page: Page, url: string): Promise<ScrapedListing | null> {
    try {
      const domData = await page.evaluate(() => {
        // Multiple selector strategies for Yad2
        const selectors = {
          title: [
            'h1',
            '[data-testid="title"]',
            '.title',
            '[class*="title"]',
            '[class*="heading"]'
          ],
          price: [
            '[data-testid="price"]',
            '.price',
            '[class*="price"]',
            'span:has-text("₪")',
            'div:has-text("₪")'
          ],
          rooms: [
            '[data-testid="rooms"]',
            'span:has-text("חדרים")',
            'div:has-text("חדרים")'
          ],
          size: [
            'span:has-text("מ״ר")',
            'div:has-text("מ״ר")',
            '[class*="size"]'
          ],
          floor: [
            'span:has-text("קומה")',
            'div:has-text("קומה")'
          ],
          location: [
            '[data-testid="location"]',
            '.location',
            '[class*="location"]',
            '[class*="address"]'
          ],
          description: [
            '[data-testid="description"]',
            '.description',
            '[class*="description"]',
            'p'
          ],
          images: [
            'img[src*="yad2"]',
            'img[src*="img"]',
            '.image img',
            '[class*="image"] img'
          ]
        };

        const extractText = (selectors: string[]): string => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element?.textContent?.trim()) {
              return element.textContent.trim();
            }
          }
          return '';
        };

        const extractImages = (): string[] => {
          const images: string[] = [];
          const imgElements = document.querySelectorAll('img');
          imgElements.forEach(img => {
            const src = img.src || img.getAttribute('data-src');
            if (src && (src.includes('yad2') || src.includes('img'))) {
              images.push(src);
            }
          });
          return images.slice(0, 10);
        };

        return {
          title: extractText(selectors.title),
          price: extractText(selectors.price),
          rooms: extractText(selectors.rooms),
          size: extractText(selectors.size),
          floor: extractText(selectors.floor),
          location: extractText(selectors.location),
          description: extractText(selectors.description),
          images: extractImages(),
          fullText: document.body.textContent || ''
        };
      });

      if (domData.title || domData.price) {
        return this.convertDomToListing(domData, url);
      }
    } catch (error) {
      console.error('DOM extraction failed:', error);
    }
    return null;
  }

  private async extractFromText(page: Page, url: string): Promise<ScrapedListing | null> {
    try {
      const textContent = await page.textContent('body');
      if (!textContent) return null;

      // Hebrew pattern matching
      const patterns = {
        price: /(\d{1,3}(?:,\d{3})*)\s*₪/,
        rooms: /(\d+)\s*חדרים/,
        size: /(\d+)\s*מ[״"]ר/,
        floor: /קומה\s*(\d+)/
      };

      const extracted: any = {};

      for (const [key, pattern] of Object.entries(patterns)) {
        const match = textContent.match(pattern);
        if (match) {
          extracted[key] = key === 'price' ? parseInt(match[1].replace(/,/g, '')) : parseInt(match[1]);
        }
      }

      if (extracted.price || extracted.rooms) {
        const id = url.match(/item\/([a-zA-Z0-9]+)/)?.[1] || `yad2_${Date.now()}`;
        
        return {
          id,
          title: `דירת ${extracted.rooms || 3} חדרים`,
          price: extracted.price || 0,
          currency: '₪',
          location: 'ישראל',
          city: 'תל אביב',
          rooms: extracted.rooms || 3,
          floor: extracted.floor || null,
          size_sqm: extracted.size || null,
          description: textContent.substring(0, 500),
          property_type: 'דירה',
          image_urls: [],
          amenities: [],
          listing_url: url,
          listing_type: url.includes('forsale') ? 'sale' : 'rent',
          source_platform: 'yad2'
        };
      }
    } catch (error) {
      console.error('Text extraction failed:', error);
    }
    return null;
  }

  private convertJsonLdToListing(data: any, url: string): ScrapedListing {
    const id = url.match(/item\/([a-zA-Z0-9]+)/)?.[1] || `yad2_${Date.now()}`;
    
    return {
      id,
      title: data.name || data.title || 'נכס',
      price: parseFloat(data.price || data.offers?.price || '0'),
      currency: '₪',
      location: data.address || 'ישראל',
      city: data.address?.addressLocality || 'תל אביב',
      rooms: 3,
      floor: null,
      size_sqm: null,
      description: data.description || '',
      property_type: 'דירה',
      image_urls: Array.isArray(data.image) ? data.image : data.image ? [data.image] : [],
      amenities: [],
      listing_url: url,
      listing_type: url.includes('forsale') ? 'sale' : 'rent',
      source_platform: 'yad2'
    };
  }

  private convertMetaToListing(data: any, url: string): ScrapedListing {
    const id = url.match(/item\/([a-zA-Z0-9]+)/)?.[1] || `yad2_${Date.now()}`;
    
    return {
      id,
      title: data.title || 'נכס',
      price: parseFloat(data.price || '0'),
      currency: data.currency || '₪',
      location: 'ישראל',
      city: 'תל אביב',
      rooms: 3,
      floor: null,
      size_sqm: null,
      description: data.description || '',
      property_type: 'דירה',
      image_urls: data.image ? [data.image] : [],
      amenities: [],
      listing_url: url,
      listing_type: url.includes('forsale') ? 'sale' : 'rent',
      source_platform: 'yad2'
    };
  }

  private convertDomToListing(data: any, url: string): ScrapedListing {
    const id = url.match(/item\/([a-zA-Z0-9]+)/)?.[1] || `yad2_${Date.now()}`;
    
    // Extract price from text
    const priceMatch = data.price.match(/(\d{1,3}(?:,\d{3})*)/);
    const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 0;
    
    // Extract rooms from text
    const roomsMatch = data.rooms.match(/(\d+)/);
    const rooms = roomsMatch ? parseInt(roomsMatch[1]) : 3;
    
    return {
      id,
      title: data.title || `דירת ${rooms} חדרים`,
      price,
      currency: '₪',
      location: data.location || 'ישראל',
      city: 'תל אביב',
      rooms,
      floor: null,
      size_sqm: null,
      description: data.description || data.fullText.substring(0, 500),
      property_type: 'דירה',
      image_urls: data.images || [],
      amenities: [],
      listing_url: url,
      listing_type: url.includes('forsale') ? 'sale' : 'rent',
      source_platform: 'yad2'
    };
  }

  /**
   * ULTRA-AGGRESSIVE search results scraping
   */
  async scrapeSearchResults(url: string, limit = 10): Promise<ScrapedListing[]> {
    if (!this.context) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`🔍 ULTRA-STEALTH search scraping: ${url}`);

      // Block resources for speed
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Navigate with human behavior
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      // Wait for content to load
      await page.waitForTimeout(3000 + Math.random() * 2000);

      // Extract listing URLs
      const listingUrls = await page.evaluate((maxResults: number) => {
        const urls: string[] = [];
        const links = document.querySelectorAll('a[href*="/realestate/item/"]');
        
        links.forEach((link) => {
          const href = (link as HTMLAnchorElement).href;
          if (href && !urls.includes(href) && urls.length < maxResults) {
            urls.push(href);
          }
        });
        
        return urls;
      }, limit);

      console.log(`📋 Found ${listingUrls.length} listing URLs`);

      // Scrape each listing with concurrency control
      const listings: ScrapedListing[] = [];
      const concurrency = 2; // Conservative for stealth

      for (let i = 0; i < listingUrls.length; i += concurrency) {
        const batch = listingUrls.slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (listingUrl) => {
          try {
            // Add random delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            return await this.scrapeSingleListing(listingUrl);
          } catch (error) {
            console.error(`Failed to scrape ${listingUrl}:`, error);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validListings = batchResults.filter((listing): listing is ScrapedListing => listing !== null);
        listings.push(...validListings);
      }

      console.log(`✅ ULTRA-STEALTH extracted ${listings.length}/${listingUrls.length} listings`);
      return listings;

    } catch (error) {
      console.error('❌ ULTRA-STEALTH search failed:', error);
      return [];
    } finally {
      await page.close();
    }
  }
}