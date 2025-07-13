import FirecrawlApp from '@mendable/firecrawl-js';
import { ScrapedListing } from './base-scraper';
import { z } from 'zod';

export class Yad2ScraperJSON {
  private firecrawl: FirecrawlApp;

  constructor() {
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is required');
    }

    this.firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });
  }

  /**
   * Step 1: Extract listing URLs from search/list pages
   */
  async extractListingUrls(searchUrl: string, limit = 10): Promise<string[]> {
    console.log(`🔍 Step 1: Extracting listing URLs from search page (limit: ${limit})`);
    
    try {
      const listingUrls = await this.findListingUrls(searchUrl, limit);
      console.log(`✅ Found ${listingUrls.length} listing URLs`);
      return listingUrls;
    } catch (error) {
      console.error('❌ Error extracting listing URLs:', error);
      return [];
    }
  }

  /**
   * Step 2: Scrape multiple individual listings in parallel
   */
  async scrapeListings(listingUrls: string[]): Promise<ScrapedListing[]> {
    console.log(`🏠 Step 2: Scraping ${listingUrls.length} individual listings in parallel`);
    
    if (listingUrls.length === 0) {
      return [];
    }

    // Use Promise.all for parallel scraping with concurrency control
    const concurrency = 3; // Limit concurrent requests to avoid overwhelming Firecrawl
    const listings: ScrapedListing[] = [];
    
    for (let i = 0; i < listingUrls.length; i += concurrency) {
      const batch = listingUrls.slice(i, i + concurrency);
      console.log(`Processing batch ${Math.floor(i/concurrency) + 1}/${Math.ceil(listingUrls.length/concurrency)} (${batch.length} listings)`);
      
      const batchPromises = batch.map(async (url, index) => {
        try {
          console.log(`  Scraping ${i + index + 1}/${listingUrls.length}: ${url}`);
          
          // Add small delay to be respectful to the server
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
          }
          
          const listing = await this.scrapeSingleListing(url);
          if (listing) {
            console.log(`  ✅ Success: ${listing.title.substring(0, 50)}...`);
          }
          return listing;
        } catch (error) {
          // Better error categorization
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('unreachable')) {
            console.warn(`  ⏱️ Network timeout for ${url}`);
          } else if (errorMsg.includes('captcha') || errorMsg.includes('blocked')) {
            console.warn(`  🤖 Blocked/Captcha detected for ${url}`);
          } else {
            console.error(`  ❌ Error scraping ${url}:`, errorMsg);
          }
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const validListings = batchResults.filter((listing): listing is ScrapedListing => listing !== null);
      listings.push(...validListings);
      
      // Small delay between batches to be respectful
      if (i + concurrency < listingUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Successfully scraped ${listings.length}/${listingUrls.length} listings`);
    return listings;
  }

  /**
   * Combined method: Extract URLs then scrape listings (two-step approach)
   */
  async scrapeSearchResults(url: string, limit = 10): Promise<ScrapedListing[]> {
    console.log('🚀 Starting two-step scraping process...');

    try {
      // Step 1: Get listing URLs
      const listingUrls = await this.extractListingUrls(url, limit);
      
      if (listingUrls.length === 0) {
        console.log('No listing URLs found on search page');
        return [];
      }

      // Step 2: Scrape all listings in parallel
      const listings = await this.scrapeListings(listingUrls);
      
      console.log(`🎉 Two-step process complete: ${listings.length} listings extracted`);
      return listings;
    } catch (error) {
      console.error('❌ Two-step scraping error:', error);
      throw error;
    }
  }

  /**
   * Optimized single listing extraction (Step 2 component)
   */
  async scrapeSingleListing(url: string): Promise<ScrapedListing | null> {
    // Check for captcha URLs before making request
    if (url.includes('hcaptcha') || url.includes('captcha')) {
      console.warn('Skipping captcha URL:', url);
      return null;
    }

    try {
      // FINAL ULTRA STRATEGY: Raw HTML extraction with local parsing
      const result = await this.firecrawl.scrapeUrl(url, {
        formats: ['html', 'markdown', 'links'], // Get raw content for local parsing
        // MAXIMUM STEALTH MODE
        mobile: false,
        onlyMainContent: false, // Get full page to see if captcha is present
        waitFor: 8000, // Longer wait for organic loading
        timeout: 60000, // Extended timeout
        // ISRAEL-FOCUSED STEALTH HEADERS
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,ar;q=0.8,en-US;q=0.7,en;q=0.6',
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        location: {
          country: 'IL',
          languages: ['he', 'ar', 'en']
        },
      });

      if (!result || result.error) {
        console.error('Failed to scrape URL - error in result');
        console.error('Result:', result);
        return null;
      }

      // Check if we got ANY content at all
      if (!('html' in result) && !('markdown' in result)) {
        console.error('No HTML or markdown content received');
        console.error('Available fields:', Object.keys(result));
        return null;
      }

      // Check for captcha in the raw content
      const content = ('html' in result ? result.html : '') || ('markdown' in result ? result.markdown : '') || '';
      if (content.includes('hCaptcha') || content.includes('Are you for real') || content.includes('אני אנושי')) {
        console.warn('🤖 Captcha detected in raw content, Yad2 is blocking the request');
        return null;
      }

      // If we got legitimate content, try to parse it locally
      return this.parseHTMLContent(content, url);
    } catch (error) {
      console.error('Error scraping single listing with JSON mode:', error);
      return null;
    }
  }

  /**
   * ULTRA FALLBACK: Local HTML parsing when AI extraction fails
   */
  private parseHTMLContent(content: string, url: string): ScrapedListing | null {
    try {
      console.log('🔧 Attempting local HTML parsing...');
      
      // Extract basic info using regex patterns
      const id = url.match(/item\/([a-zA-Z0-9]+)/)?.[1] || `yad2_${Date.now()}`;
      
      // Try to extract title (look for common patterns)
      const titlePatterns = [
        /<title[^>]*>([^<]+)</i,
        /<h1[^>]*>([^<]+)</i,
        /<h2[^>]*>([^<]+)</i,
        /class="[^"]*title[^"]*"[^>]*>([^<]+)</i
      ];
      
      let title = 'Property Listing';
      for (const pattern of titlePatterns) {
        const match = content.match(pattern);
        if (match && match[1] && !match[1].includes('Yad2') && match[1].length > 10) {
          title = match[1].trim();
          break;
        }
      }
      
      // Extract price (look for numbers with ₪ or price indicators)
      const pricePatterns = [
        /(\d{1,3}(?:,\d{3})*)\s*₪/g,
        /price[^>]*>.*?(\d{1,3}(?:,\d{3})*)/gi,
        /מחיר[^>]*>.*?(\d{1,3}(?:,\d{3})*)/gi
      ];
      
      let price = 0;
      for (const pattern of pricePatterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
          const priceNum = parseInt(match[1].replace(/,/g, ''));
          if (priceNum > 1000 && priceNum < 50000) { // Reasonable rent range
            price = priceNum;
            break;
          }
        }
        if (price > 0) break;
      }
      
      // If we found any real data, return a basic listing
      if (title.length > 5 && (price > 0 || content.length > 1000)) {
        console.log(`✅ Local parsing found: "${title.substring(0, 50)}..." price: ${price}`);
        
        return {
          id,
          title,
          price,
          currency: '₪',
          location: 'Israel', // Default since we can't parse location reliably
          city: 'Unknown',
          rooms: 3, // Default
          floor: null,
          size_sqm: null,
          description: title,
          property_type: 'דירה',
          image_urls: [],
          amenities: [],
          contact_name: undefined,
          phone_number: undefined,
          listing_url: url,
          listing_type: url.includes('forsale') ? 'sale' : 'rent',
          source_platform: 'yad2'
        };
      }
      
      console.warn('❌ Local parsing failed - insufficient data extracted');
      return null;
      
    } catch (error) {
      console.error('Error in local HTML parsing:', error);
      return null;
    }
  }

  private getHebrewRealEstateSchema() {
    return z.object({
      // Property details
      title: z.string().describe('Property title/headline in Hebrew'),
      price: z
        .number()
        .describe(
          'Price in Israeli Shekels (NIS). For rental listings this is monthly rent, for sale listings this is the total sale price. Extract only the numeric value, ignore currency symbols'
        ),
      rooms: z.number().describe('Number of rooms. Look for "חדרים" or room count'),

      // Size and floor information - specifically addressing user issues
      size_sqm: z
        .number()
        .nullable()
        .describe(
          'Apartment size in square meters. Look for patterns like "X מ״ר", "X מטר רבוע", or size numbers followed by size indicators'
        ),
      floor: z
        .number()
        .nullable()
        .describe('Building floor number. Look for "קומה X", "קומת X", or floor indicators'),
      total_floors: z
        .number()
        .nullable()
        .describe('Total floors in building. Look for "מתוך X קומות" or similar patterns'),

      // Location parsing - addressing Hebrew prefix issues
      raw_location: z.string().describe('Full location text as it appears on the page'),
      city: z
        .string()
        .describe(
          'ACTUAL city name where THIS SPECIFIC PROPERTY is located. Extract the real city from the listing content, NOT from examples or templates. Remove "ב" prefix if present (e.g., "בחריש" → "חריש", "בתל אביב" → "תל אביב"). Must match the property being viewed, not placeholder cities.'
        ),
      neighborhood: z
        .string()
        .nullable()
        .describe(
          'Neighborhood or area within the city. This is usually more specific than the city'
        ),
      address: z.string().nullable().describe('Street address if available'),

      // Property characteristics
      description: z.string().describe('Property description text'),
      property_type: z.string().describe('Type of property in Hebrew (דירה, בית, פנטהאוז, etc.)'),
      condition: z.string().nullable().describe('Property condition (משופץ, חדש, ישן, etc.)'),

      // Amenities and features
      amenities: z
        .array(z.string())
        .describe('List of amenities in Hebrew (חניה, מעלית, מרפסת, מיזוג, etc.)'),
      parking: z.boolean().nullable().describe('Whether parking is available. Look for "חניה"'),
      elevator: z.boolean().nullable().describe('Whether elevator is available. Look for "מעלית"'),
      balcony: z.boolean().nullable().describe('Whether balcony is available. Look for "מרפסת"'),
      air_conditioning: z
        .boolean()
        .nullable()
        .describe('Whether air conditioning is available. Look for "מיזוג" or "מזגן"'),

      // Contact information
      contact_name: z.string().nullable().describe('Contact person name'),
      phone_number: z.string().nullable().describe('Contact phone number'),

      // Listing metadata
      listing_type: z
        .enum(['rent', 'sale'])
        .describe('Whether this is for rent (השכרה) or sale (מכירה)'),
      immediate_entry: z
        .boolean()
        .nullable()
        .describe('Whether immediate entry is available. Look for "כניסה מיידית"'),
      entry_date: z.string().nullable().describe('Entry date if specified'),

      // Images
      images: z.array(z.string()).describe('Array of REAL image URLs from THIS SPECIFIC LISTING ONLY. Must be actual Yad2 image URLs (img.yad2.co.il, etc.) starting with http:// or https://. DO NOT include placeholder URLs like "example.com", "image1.jpg", or template images. Return empty array if no real images found.'),
    });
  }

  /**
   * Optimized URL discovery using Firecrawl map (Step 1 implementation)
   */
  private async findListingUrls(searchUrl: string, limit: number): Promise<string[]> {
    console.log('Trying Firecrawl map for URL discovery...');

    try {
      // Use map API which is specifically designed for URL discovery
      const mapResult = await this.firecrawl.mapUrl(searchUrl, {
        search: 'realestate/item',
        limit: Math.min(limit * 3, 50), // Get more than needed to account for filtering
        includeSubdomains: false,
      });

      if (mapResult && 'links' in mapResult && Array.isArray(mapResult.links)) {
        const listingUrls = mapResult.links
          .filter((url: string) => {
            // Only include actual listing URLs, not search pages or captcha
            return url.includes('/realestate/item/') && 
                   !url.includes('/realestate/rent') && 
                   !url.includes('/realestate/forsale') &&
                   !url.includes('hcaptcha') &&
                   !url.includes('captcha');
          })
          .slice(0, limit);
        
        if (listingUrls.length > 0) {
          console.log(`Map API found ${listingUrls.length} listing URLs`);
          return listingUrls;
        }
      }

      console.log('Map API returned no results, trying fallback extraction...');
      return await this.fallbackLinkExtraction(searchUrl, limit);

    } catch (error) {
      console.error('Map API error:', error);
      console.log('Falling back to direct HTML extraction...');
      return await this.fallbackLinkExtraction(searchUrl, limit);
    }
  }

  /**
   * Fallback URL extraction using direct HTML scraping
   */
  private async fallbackLinkExtraction(searchUrl: string, limit: number): Promise<string[]> {
    console.log('Using optimized fallback link extraction...');
    
    try {
      const searchResult = await this.firecrawl.scrapeUrl(searchUrl, {
        formats: ['links', 'html'],
        onlyMainContent: false,
        waitFor: 3000, // Reduced wait time
        timeout: 20000, // Reduced timeout for faster response
        headers: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        location: {
          country: 'IL',
          languages: ['he', 'en'],
        },
      });

      if (!searchResult || searchResult.error) {
        console.error('Fallback extraction failed');
        return [];
      }

      const listingUrls: string[] = [];

      // Extract from links array - look for multiple patterns
      if ('links' in searchResult && searchResult.links && Array.isArray(searchResult.links)) {
        console.log(`Found ${searchResult.links.length} links on search page`);

        for (const link of searchResult.links) {
          // Direct listing URLs (filter out captcha)
          if (link.includes('/realestate/item/') && 
              !link.includes('hcaptcha') && 
              !link.includes('captcha') && 
              !listingUrls.includes(link)) {
            listingUrls.push(link);
            console.log('Found direct listing URL:', link);
          }
          
          // Look for URLs with open-item-id parameters
          const itemIdMatch = link.match(/open-item-id=([a-zA-Z0-9]+)/);
          if (itemIdMatch) {
            const itemId = itemIdMatch[1];
            // Skip captcha item IDs
            if (itemId !== 'hcaptcha' && !itemId.includes('captcha')) {
              const directUrl = `https://www.yad2.co.il/realestate/item/${itemId}`;
              if (!listingUrls.includes(directUrl)) {
                listingUrls.push(directUrl);
                console.log('Found listing URL from open-item-id:', directUrl);
              }
            }
          }

          // Look for data-item-id attributes in URLs  
          const dataItemMatch = link.match(/data-item-id[=\s]*[\"\']*([a-zA-Z0-9]+)[\"\']*/);
          if (dataItemMatch) {
            const itemId = dataItemMatch[1];
            // Skip captcha item IDs
            if (itemId !== 'hcaptcha' && !itemId.includes('captcha')) {
              const directUrl = `https://www.yad2.co.il/realestate/item/${itemId}`;
              if (!listingUrls.includes(directUrl)) {
                listingUrls.push(directUrl);
                console.log('Found listing URL from data-item-id:', directUrl);
              }
            }
          }
        }
      }

      // Also try extracting from HTML
      if (listingUrls.length === 0 && 'html' in searchResult && searchResult.html) {
        console.log('Trying HTML pattern extraction...');

        const patterns = [
          // Modern Yad2 patterns
          /data-item-id[=\s]*[\"\']*([a-zA-Z0-9]+)[\"\']*/g,
          /open-item-id[=\s]*[\"\']*([a-zA-Z0-9]+)[\"\']*/g,
          // Handle href patterns with item IDs
          /href[=\s]*[\"\']*[^\/]*\/realestate\/item\/([a-zA-Z0-9]+)/g,
          // React/Vue component data attributes
          /data-[a-z-]*id[=\s]*[\"\']*([a-zA-Z0-9]+)[\"\']*/g,
          /\/realestate\/item\/([a-zA-Z0-9]+)/g,
          /item\/([a-zA-Z0-9]+)/g,
          // Additional patterns for different Yad2 structures
          /"itemId"[:\s]*"([a-zA-Z0-9]+)"/g,
          /'itemId'[:\s]*'([a-zA-Z0-9]+)'/g,
          /itemId[:\s]*([a-zA-Z0-9]+)/g
        ];

        for (const pattern of patterns) {
          const matches = [...searchResult.html.matchAll(pattern)];
          for (const match of matches) {
            const itemId = match[1];
            // Skip captcha item IDs
            if (itemId !== 'hcaptcha' && !itemId.includes('captcha') && itemId.length > 3) {
              const directUrl = `https://www.yad2.co.il/realestate/item/${itemId}`;
              if (!listingUrls.includes(directUrl)) {
                listingUrls.push(directUrl);
                console.log('Found listing URL from HTML pattern:', directUrl);
              }
            }
          }
          
          if (listingUrls.length >= limit) break;
        }
      }

      console.log(`Fallback extraction found ${listingUrls.length} listing URLs`);
      return listingUrls.slice(0, limit);
      
    } catch (error) {
      console.error('Error in fallback extraction:', error);
      return [];
    }
  }

  private convertJSONToListing(jsonData: any, url: string): ScrapedListing | null {
    try {
      // Extract ID from URL - only handle Yad2 patterns
      let id: string;
      const itemIdMatch = url.match(/item\/([a-zA-Z0-9]+)/);
      
      if (itemIdMatch) {
        id = itemIdMatch[1];
      } else {
        id = `yad2_${Date.now()}`;
      }

      // Detect captcha content
      const isCaptcha = url.includes('hcaptcha') || 
                       url.includes('captcha') ||
                       (jsonData.description && jsonData.description.includes('hCaptcha')) ||
                       (jsonData.title && jsonData.title.includes('captcha')) ||
                       (jsonData.description && jsonData.description.includes('אני אנושי'));

      if (isCaptcha) {
        console.warn('Captcha detected in content, skipping:', url);
        return null;
      }

      // Validate required fields
      if (!jsonData.title || !jsonData.price || !jsonData.rooms || !jsonData.city) {
        console.warn('Missing required fields in JSON data:', jsonData);
        return null;
      }

      // Validate against common placeholder data
      const invalidCities = ['תל אביב', 'ירושלים', 'חיפה']; // Common examples used in templates
      const invalidImages = ['example.com', 'image1.jpg', 'image2.jpg', 'placeholder'];
      
      // Filter out placeholder images
      const validImages = (jsonData.images || []).filter((img: string) => {
        return img && 
               img.startsWith('http') && 
               !invalidImages.some(invalid => img.includes(invalid)) &&
               (img.includes('yad2.co.il') || img.includes('img.yad2') || img.includes('utfs.io'));
      });

      // Warn if we got a common placeholder city (unless URL suggests it's actually that city)
      if (invalidCities.includes(jsonData.city) && !url.includes('tel-aviv') && !url.includes('jerusalem') && !url.includes('haifa')) {
        console.warn(`Potentially extracted placeholder city "${jsonData.city}" for URL: ${url}`);
      }

      // Process city name - remove Hebrew prefix "ב" if present
      let processedCity = jsonData.city;
      if (processedCity.startsWith('ב') && processedCity.length > 1) {
        processedCity = processedCity.substring(1);
        console.log(`Removed Hebrew prefix 'ב' from city: ${jsonData.city} → ${processedCity}`);
      }

      // Create comprehensive location string
      let fullLocation = processedCity;
      if (jsonData.neighborhood && jsonData.neighborhood !== processedCity) {
        fullLocation = `${jsonData.neighborhood}, ${processedCity}`;
      }
      if (jsonData.address) {
        fullLocation = `${jsonData.address}, ${fullLocation}`;
      }

      // Combine amenities from various sources
      const amenities: string[] = [];
      if (jsonData.amenities && Array.isArray(jsonData.amenities)) {
        amenities.push(...jsonData.amenities);
      }
      // Add boolean amenities to the array
      if (jsonData.parking) amenities.push('חניה');
      if (jsonData.elevator) amenities.push('מעלית');
      if (jsonData.balcony) amenities.push('מרפסת');
      if (jsonData.air_conditioning) amenities.push('מיזוג אוויר');

      // Determine listing type from URL if not provided
      let listingType = jsonData.listing_type;
      if (!listingType) {
        listingType = url.includes('forsale') ? 'sale' : 'rent';
      }

      const listing: ScrapedListing = {
        id,
        title: jsonData.title || 'דירה',
        price: jsonData.price || 0,
        currency: '₪',
        location: fullLocation,
        city: processedCity,
        neighborhood: jsonData.neighborhood || undefined,
        rooms: jsonData.rooms || 0,
        floor: jsonData.floor || null,
        size_sqm: jsonData.size_sqm || null,
        description: jsonData.description || jsonData.title || 'תיאור לא זמין',
        property_type: jsonData.property_type || 'דירה',
        image_urls: validImages,
        amenities: [...new Set(amenities)], // Remove duplicates
        contact_name: jsonData.contact_name || undefined,
        phone_number: jsonData.phone_number || undefined,
        listing_url: url,
        listing_type: listingType as 'rent' | 'sale',
        source_platform: 'yad2',
      };

      // Validate price
      if (listing.price <= 0) {
        console.warn('Invalid price for listing:', listing.title);
        return null;
      }

      // Log successful extraction with details
      console.log(`✅ Successfully extracted listing: ${listing.title}`);
      if (jsonData.size_sqm) console.log(`  📏 Size: ${jsonData.size_sqm} מ״ר`);
      if (jsonData.floor) console.log(`  🏢 Floor: ${jsonData.floor}`);
      console.log(`  📍 Location: ${fullLocation}`);

      return listing;
    } catch (error) {
      console.error('Error converting JSON data to listing:', error);
      return null;
    }
  }

  // For compatibility with existing scraper manager
  async initialize() {
    // No initialization needed for Firecrawl JSON mode
  }

  async close() {
    // No cleanup needed for Firecrawl JSON mode
  }
}
