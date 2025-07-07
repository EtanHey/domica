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
        extract: {
          schema: {
            type: 'object',
            properties: {
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
      };

      const result = await this.firecrawl.scrapeUrl(url, scrapeParams);

      // Check response type
      if ('success' in result && !result.success) {
        console.error('Failed to scrape listing:', result);
        return null;
      }

      // Firecrawl returns data directly on the response object
      const { markdown = '', html = '', metadata = {}, screenshot, extract } = result;

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

      // Use extracted data if available, otherwise fall back to manual parsing
      let title = extract?.title || metadata.title || '';
      let price = extract?.price || 0;
      let rooms = extract?.rooms || 0;
      let floor: number | null = extract?.floor || null;
      let size: number | null = extract?.size_sqm || null;
      let location = extract?.location || '';
      let city = extract?.city || '';
      let description = extract?.description || '';
      let amenities = extract?.amenities || [];
      let contact_name = extract?.contact_name;
      let phone_number = extract?.phone_number;
      let property_type = extract?.property_type || 'דירה';
      let listing_type = extract?.listing_type;
      let images: string[] = [];

      console.log('Extracted data:', extract);

      // Fallback to manual parsing if extract didn't work well
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
        const descLines = markdown.split('\n').filter((line) => line.trim().length > 20);
        if (descLines.length > 0) {
          description = descLines.slice(0, 3).join(' ').substring(0, 500);
        }
      }

      // Extract images from HTML
      if (html) {
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

      // Add screenshot if available
      if (screenshot && images.length === 0) {
        images.push(screenshot);
      }

      // Fallback location
      if (!location) {
        location = 'תל אביב';
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
        location,
        city: city || location.split(',')[0].trim(),
        rooms,
        floor,
        size_sqm: size,
        description: description || markdown.substring(0, 500),
        property_type,
        image_urls: images,
        amenities,
        contact_name,
        phone_number,
        listing_url: url,
        listing_type: listing_type || (url.includes('forsale') ? 'sale' : 'rent'),
        source_platform: 'yad2',
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
