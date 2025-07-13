import FirecrawlApp, { ScrapeParams, CrawlParams } from '@mendable/firecrawl-js';
import { ScrapedListing } from './base-scraper';

export class Yad2ScraperFirecrawl {
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
  async scrapeSearchResultsWithTwoStep(url: string, limit = 10): Promise<ScrapedListing[]> {
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
   * URL discovery implementation using map and scrape
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
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: false,
        proxy: 'stealth' // CRITICAL: Use stealth proxy for search pages too
      });

      if (!searchResult || ('success' in searchResult && !searchResult.success)) {
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
        }
      }

      // Also try extracting from HTML if available
      if ('html' in searchResult && searchResult.html && listingUrls.length === 0) {
        console.log('Trying HTML pattern extraction...');

        const patterns = [
          // Modern Yad2 patterns
          /href="(\/realestate\/item\/[a-zA-Z0-9]+)"/g,
          /href="(https:\/\/www\.yad2\.co\.il\/realestate\/item\/[a-zA-Z0-9]+)"/g,
          /data-href="(\/realestate\/item\/[a-zA-Z0-9]+)"/g,
        ];

        for (const pattern of patterns) {
          const matches = [...searchResult.html.matchAll(pattern)];
          for (const match of matches) {
            const url = match[1];
            const fullUrl = url.startsWith('http') ? url : `https://www.yad2.co.il${url}`;
            if (!listingUrls.includes(fullUrl)) {
              listingUrls.push(fullUrl);
              console.log('Found listing URL from HTML pattern:', fullUrl);
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

  async scrapeSearchResults(url: string, limit = 10): Promise<ScrapedListing[]> {
    console.log('Scraping with Firecrawl...');

    try {
      // Use proper ScrapeParams with correct options
      const scrapeParams: ScrapeParams = {
        formats: ['html', 'markdown', 'links'],
        onlyMainContent: false,
        waitFor: 3000, // Wait for dynamic content
        timeout: 30000,
        headers: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        proxy: 'stealth', // Use stealth proxy to avoid detection
        skipTlsVerification: false,
        location: {
          country: 'IL',
          languages: ['he', 'en'],
        },
      };

      // First scrape the search page
      console.log('Scraping search page with enhanced params...');
      const searchResult = await this.firecrawl.scrapeUrl(url, scrapeParams);

      // Check if it's a proper response
      if ('success' in searchResult && !searchResult.success) {
        console.error('Failed to scrape search page:', searchResult);
        return [];
      }

      // Firecrawl returns data directly on the response object
      const data = searchResult;
      console.log('Search page scraped successfully');
      console.log('Available data fields:', Object.keys(data));

      // Extract listing URLs from multiple sources
      const listingUrls: string[] = [];

      // Try to get URLs from links array first
      if (data.links && Array.isArray(data.links)) {
        console.log(`Found ${data.links.length} links on page`);
        data.links.forEach((link) => {
          if (link.includes('/realestate/item/') && !listingUrls.includes(link)) {
            listingUrls.push(link);
          }
        });
      }

      // Also try to extract from HTML if available
      if (data.html && listingUrls.length === 0) {
        // Multiple patterns to find listing URLs
        const patterns = [
          /href="(\/realestate\/item\/[a-zA-Z0-9]+)"/g,
          /href="(https:\/\/www\.yad2\.co\.il\/realestate\/item\/[a-zA-Z0-9]+)"/g,
          /data-href="(\/realestate\/item\/[a-zA-Z0-9]+)"/g,
        ];

        for (const pattern of patterns) {
          const matches = [...data.html.matchAll(pattern)];
          for (const match of matches) {
            const url = match[1];
            const fullUrl = url.startsWith('http') ? url : `https://www.yad2.co.il${url}`;
            if (!listingUrls.includes(fullUrl)) {
              listingUrls.push(fullUrl);
            }
          }
        }
      }

      console.log(`Found ${listingUrls.length} listing URLs from search page`);

      if (listingUrls.length === 0) {
        // Try alternative approach - use crawl with proper params
        console.log('No listings found, trying crawl approach...');

        const crawlParams: CrawlParams = {
          limit: 50,
          maxDepth: 1,
          includePaths: ['/realestate/item/'],
          scrapeOptions: {
            formats: ['html', 'markdown'],
            onlyMainContent: false,
            waitFor: 2000,
          },
        };

        const crawlResult = await this.firecrawl.crawlUrl(url, crawlParams, 2);

        // Check response type
        if ('success' in crawlResult && !crawlResult.success) {
          console.error('Crawl failed:', crawlResult);
        } else if (Array.isArray(crawlResult)) {
          console.log(`Crawl found ${crawlResult.length} pages`);
          for (const page of crawlResult) {
            if (page.url && page.url.includes('/realestate/item/')) {
              listingUrls.push(page.url);
            }
          }
        }
      }

      // Limit to requested number
      const urlsToScrape = listingUrls.slice(0, limit);
      console.log(`Scraping ${urlsToScrape.length} listings...`);

      const listings: ScrapedListing[] = [];

      for (const listingUrl of urlsToScrape) {
        try {
          const listing = await this.scrapeSingleListing(listingUrl);
          if (listing) {
            listings.push(listing);
          }
        } catch (error) {
          console.error(`Error scraping listing ${listingUrl}:`, error);
        }
      }

      return listings;
    } catch (error) {
      console.error('Firecrawl scraping error:', error);
      throw error;
    }
  }

  async scrapeSingleListing(url: string): Promise<ScrapedListing | null> {
    try {
      console.log(`Scraping listing: ${url}`);

      const scrapeParams: ScrapeParams = {
<<<<<<< HEAD
        formats: ['markdown', 'html', 'screenshot', 'extract'],
        onlyMainContent: false,
        waitFor: 2000,
        timeout: 20000,
        headers: {
          'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        },
        proxy: 'stealth',
        location: {
          country: 'IL',
          languages: ['he'],
        },
=======
        formats: ['markdown', 'html', 'extract'],
        onlyMainContent: true, // Focus only on main content to avoid "similar properties" sections
        proxy: 'stealth', // CRITICAL: Keep stealth proxy - let Firecrawl handle the rest
>>>>>>> 50984b7 (Working version finally)
        extract: {
          schema: {
            type: 'object',
            properties: {
<<<<<<< HEAD
              title: { type: 'string', description: 'Property title or headline' },
              price: {
                type: 'number',
                description: 'Monthly rental price or sale price in shekels',
              },
              rooms: { type: 'number', description: 'Number of rooms' },
              floor: { type: 'number', description: 'Floor number' },
              size_sqm: { type: 'number', description: 'Size in square meters' },
              location: { type: 'string', description: 'Full address or location' },
              city: { type: 'string', description: 'City name only' },
              neighborhood: { type: 'string', description: 'Neighborhood or area name' },
              description: { type: 'string', description: 'Property description' },
              amenities: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of amenities like parking, elevator, etc',
              },
              contact_name: { type: 'string', description: 'Name of the contact person' },
              phone_number: { type: 'string', description: 'Contact phone number' },
              property_type: {
                type: 'string',
                description: 'Type of property (apartment, house, etc)',
              },
              listing_type: {
                type: 'string',
                enum: ['rent', 'sale'],
                description: 'Whether this is for rent or sale',
              },
            },
            required: [
              'price',
              'title',
              'rooms',
              'floor',
              'size_sqm',
              'location',
              'description',
              'amenities',
              'contact_name',
              'phone_number',
              'property_type',
              'listing_type',
            ],
          },
        },
=======
              title: { type: 'string', description: 'MAIN property title/headline in Hebrew for the PRIMARY listing being viewed. Do NOT extract titles from similar properties or recommendations on the page.' },
              price: {
                type: 'number',
                description: 'Price in Israeli Shekels (NIS) for the MAIN property being viewed. For rental listings this is monthly rent, for sale listings this is the total sale price. Extract only the numeric value from the PRIMARY listing, ignore prices from similar properties or recommendations.'
              },
              rooms: { type: 'number', description: 'Number of rooms. Look for \"חדרים\" or room count' },
              size_sqm: {
                type: 'number',
                description: 'Apartment size in square meters. Look for patterns like \"X מ״ר\", \"X מטר רבוע\", or size numbers followed by size indicators'
              },
              floor: {
                type: 'number',
                description: 'Building floor number. Look for \"קומה X\", \"קומת X\", or floor indicators'
              },
              total_floors: {
                type: 'number',
                description: 'Total floors in building. Look for \"מתוך X קומות\" or similar patterns'
              },
              raw_location: { type: 'string', description: 'Full location text as it appears on the page' },
              city: {
                type: 'string',
                description: 'ACTUAL city name where THIS MAIN PROPERTY BEING VIEWED is located. Extract the real city from the PRIMARY listing content only, NOT from similar properties, recommendations, or other listings on the page. Remove \"ב\" prefix if present (e.g., \"בחריש\" → \"חריש\", \"בתל אביב\" → \"תל אביב\"). Must match ONLY the main property being viewed, ignore all other properties shown on the page.'
              },
              neighborhood: {
                type: 'string',
                description: 'Neighborhood or area within the city. This is usually more specific than the city'
              },
              address: { type: 'string', description: 'Street address if available' },
              description: { type: 'string', description: 'Property description text' },
              property_type: { type: 'string', description: 'Type of property in Hebrew (דירה, בית, פנטהאוז, etc.)' },
              condition: { type: 'string', description: 'Property condition (משופץ, חדש, ישן, etc.)' },
              amenities: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of amenities in Hebrew (חניה, מעלית, מרפסת, מיזוג, etc.)'
              },
              parking: { type: 'boolean', description: 'Whether parking is available. Look for \"חניה\"' },
              elevator: { type: 'boolean', description: 'Whether elevator is available. Look for \"מעלית\"' },
              balcony: { type: 'boolean', description: 'Whether balcony is available. Look for \"מרפסת\"' },
              air_conditioning: {
                type: 'boolean',
                description: 'Whether air conditioning is available. Look for \"מיזוג\" or \"מזגן\"'
              },
              contact_name: { type: 'string', description: 'Contact person name' },
              phone_number: { type: 'string', description: 'Contact phone number' },
              listing_type: {
                type: 'string',
                enum: ['rent', 'sale'],
                description: 'Whether this is for rent (השכרה) or sale (מכירה)'
              },
              immediate_entry: {
                type: 'boolean',
                description: 'Whether immediate entry is available. Look for \"כניסה מיידית\"'
              },
              entry_date: { type: 'string', description: 'Entry date if specified' },
              images: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of REAL image URLs from THIS SPECIFIC LISTING ONLY. Must be actual Yad2 image URLs (img.yad2.co.il, etc.) starting with http:// or https://. DO NOT include placeholder URLs like \"example.com\", \"image1.jpg\", or template images. Return empty array if no real images found.'
              }
            },
            required: ['title', 'price', 'rooms', 'city', 'description']
          }
        }
>>>>>>> 50984b7 (Working version finally)
      };

      const result = await this.firecrawl.scrapeUrl(url, scrapeParams);

      // Check response type
      if ('success' in result && !result.success) {
        console.error('Failed to scrape listing:', result);
        return null;
      }

      // Firecrawl returns data directly on the response object
      const { markdown = '', html = '', metadata = {}, screenshot, extract } = result;
<<<<<<< HEAD

=======
      
>>>>>>> 50984b7 (Working version finally)
      // Check if this is a captcha page
      if (
        markdown.includes('Are you for real') ||
        html.includes('Are you for real') ||
        markdown.includes('px-captcha') ||
        html.includes('px-captcha')
      ) {
        console.log('Captcha detected on listing page, skipping');
        return null;
      }

      // Extract ID from URL
      const idMatch = url.match(/item\/([a-zA-Z0-9]+)/);
      const id = idMatch ? idMatch[1] : `yad2_${Date.now()}`;

<<<<<<< HEAD
      // Use extracted data if available, otherwise fall back to manual parsing
=======
      // Use JSON extraction if available, otherwise fall back to manual parsing
>>>>>>> 50984b7 (Working version finally)
      let title = extract?.title || metadata.title || '';
      let price = extract?.price || 0;
      let rooms = extract?.rooms || 0;
      let floor: number | null = extract?.floor || null;
      let size: number | null = extract?.size_sqm || null;
<<<<<<< HEAD
      let location = extract?.location || '';
      let city = extract?.city || '';
=======
      let location = extract?.raw_location || extract?.city || '';
      let city = extract?.city || '';
      let neighborhood = extract?.neighborhood;
      let address = extract?.address;
>>>>>>> 50984b7 (Working version finally)
      let description = extract?.description || '';
      let amenities = extract?.amenities || [];
      let contact_name = extract?.contact_name;
      let phone_number = extract?.phone_number;
      let property_type = extract?.property_type || 'דירה';
      let listing_type = extract?.listing_type;
<<<<<<< HEAD
      let images: string[] = [];

      console.log('Extracted data:', extract);

      // Fallback to manual parsing if extract didn't work well
=======
      let images: string[] = extract?.images || [];

      console.log('JSON extraction result:', extract ? 'Available' : 'Not available');
      if (extract) {
        console.log(`  Title: ${extract.title || 'N/A'}`);
        console.log(`  Price: ${extract.price || 'N/A'}`);
        console.log(`  Rooms: ${extract.rooms || 'N/A'}`);
        console.log(`  City: ${extract.city || 'N/A'}`);
      }

      // Fallback to manual parsing if JSON extraction didn't work well
>>>>>>> 50984b7 (Working version finally)
      if (price === 0 || !title) {
        console.log('Falling back to manual parsing...');

        // Extract price manually if needed
        if (price === 0) {
          const pricePatterns = [
            /₪\s*([\d,]+)/,
            /price[^>]*>₪?\s*([\d,]+)/i,
            /מחיר[^>]*>₪?\s*([\d,]+)/,
            /"price":\s*"?([\d,]+)"?/,
            /data-price="([\d,]+)"/,
            /([\d,]+)\s*₪/,
            /([\d.]+)\s*מיליון/,
          ];

          for (const pattern of pricePatterns) {
            const match = markdown.match(pattern) || html.match(pattern);
            if (match) {
              if (pattern.toString().includes('מיליון')) {
                price = Math.round(parseFloat(match[1]) * 1000000);
              } else {
                price = parseInt(match[1].replace(/,/g, ''));
              }
              if (price > 0) {
                console.log(`Found price ${price} using pattern: ${pattern}`);
                break;
              }
            }
          }
        }

        // Extract rooms if needed
        if (rooms === 0) {
          const roomsMatch = markdown.match(/(\d+)\s*חדרים/) || html.match(/(\d+)\s*חדרים/);
          if (roomsMatch) {
            rooms = parseInt(roomsMatch[1]);
          }
        }

        // Extract floor if needed
        if (!floor) {
          const floorMatch = markdown.match(/קומה\s*(\d+)/) || html.match(/קומה\s*(\d+)/);
          if (floorMatch) {
            floor = parseInt(floorMatch[1]);
          }
        }

        // Extract size if needed
        if (!size) {
          const sizeMatch = markdown.match(/(\d+)\s*מ["״ר]/) || html.match(/(\d+)\s*מ["״ר]/);
          if (sizeMatch) {
            size = parseInt(sizeMatch[1]);
          }
        }

        // Extract location from title if needed
        if (!location && title) {
          const locationMatch = title.match(/ב(.+)$/);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }
        }
      }

      // Create title if missing
      if (!title && rooms > 0) {
        title = `דירת ${rooms} חדרים`;
      }

      // Create description if missing
      if (!description) {
<<<<<<< HEAD
        const descLines = markdown.split('\n').filter((line) => line.trim().length > 20);
=======
        const descLines = markdown.split('\n').filter(line => line.trim().length > 20);
>>>>>>> 50984b7 (Working version finally)
        if (descLines.length > 0) {
          description = descLines.slice(0, 3).join(' ').substring(0, 500);
        }
      }

      // Extract images from HTML if not available from JSON
      if (images.length === 0 && html) {
        const imgPattern = /<img[^>]+src="([^"]+)"/g;
        const imgMatches = [...html.matchAll(imgPattern)];
        images = imgMatches
          .map((match) => match[1])
          .filter(
            (src) =>
              src &&
              !src.includes('data:') &&
              !src.includes('logo') &&
              !src.includes('icon') &&
              (src.includes('yad2') || src.includes('image'))
          )
          .slice(0, 10);
      }
<<<<<<< HEAD

      // Add screenshot if available
=======
      
      // Add screenshot if available and no other images
>>>>>>> 50984b7 (Working version finally)
      if (screenshot && images.length === 0) {
        images.push(screenshot);
      }

      // Combine amenities from various sources
      const finalAmenities: string[] = [...amenities];
      if (extract?.parking) finalAmenities.push('חניה');
      if (extract?.elevator) finalAmenities.push('מעלית');
      if (extract?.balcony) finalAmenities.push('מרפסת');
      if (extract?.air_conditioning) finalAmenities.push('מיזוג אוויר');

      // Process city name - remove Hebrew prefix "ב" if present
      let processedCity = city;
      if (processedCity.startsWith('ב') && processedCity.length > 1) {
        processedCity = processedCity.substring(1);
        console.log(`Removed Hebrew prefix 'ב' from city: ${city} → ${processedCity}`);
      }

      // Create comprehensive location string
      let fullLocation = processedCity || location;
      if (neighborhood && neighborhood !== processedCity) {
        fullLocation = `${neighborhood}, ${processedCity}`;
      }
      if (address) {
        fullLocation = `${address}, ${fullLocation}`;
      }

      // Fallback location
      if (!fullLocation) {
        fullLocation = 'תל אביב';
      }

      // Determine listing type from URL if not provided
      if (!listing_type) {
        listing_type = url.includes('forsale') ? 'sale' : 'rent';
      }

      // Use extracted city or parse from location
      if (!city && location) {
        city = location.split(',')[0].trim();
      }

      return {
        id,
        title: title || 'דירה',
        price,
        currency: '₪',
<<<<<<< HEAD
        location,
        city: city || location.split(',')[0].trim(),
=======
        location: fullLocation,
        city: processedCity || fullLocation.split(',')[0].trim(),
>>>>>>> 50984b7 (Working version finally)
        rooms,
        floor,
        size_sqm: size,
        description: description || markdown.substring(0, 500),
        property_type,
        image_urls: images,
<<<<<<< HEAD
        amenities,
        contact_name,
        phone_number,
        listing_url: url,
        listing_type: listing_type || (url.includes('forsale') ? 'sale' : 'rent'),
        source_platform: 'yad2',
=======
        amenities: [...new Set(finalAmenities)], // Remove duplicates
        contact_name,
        phone_number,
        listing_url: url,
        listing_type: listing_type as 'rent' | 'sale',
        source_platform: 'yad2'
>>>>>>> 50984b7 (Working version finally)
      };
    } catch (error) {
      console.error('Error scraping single listing:', error);
      return null;
    }
  }

  // For compatibility with scraper manager
  async initialize() {
    // No initialization needed for Firecrawl
  }

  async close() {
    // No cleanup needed for Firecrawl
  }
}
