import { createClient } from '@supabase/supabase-js';
import { DuplicateDetectionService } from './duplicate-detection';
import { PropertyInput } from './duplicate-detection/types';
import { utapi } from '@/server/uploadthing';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Initialize duplicate detection service
const duplicateDetector = new DuplicateDetectionService(supabase as any);

interface Yad2Listing {
  yad2_id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  rooms: number;
  floor: number | null;
  size_sqm: number | null;
  description: string;
  property_type: string;
  image_urls: string[];
  amenities: string[];
  contact_name?: string;
  phone_number?: string;
  listing_url: string;
  listing_type: 'rent' | 'sale';
  updated_at: string;
}

export class Yad2Scraper {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || FIRECRAWL_API_KEY;
    if (!this.apiKey) {
      throw new Error('Firecrawl API key is required');
    }
  }

  /**
   * Normalize URL by removing query parameters and fragments
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep only the base URL without query params for consistent duplicate detection
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Extract Yad2 listing ID from URL or generate one
   */
  private extractYad2Id(url: string, title: string): string {
    // Try to extract ID from URL
    const idMatch = url.match(/item\/([a-zA-Z0-9]+)/);
    if (idMatch) {
      return idMatch[1];
    }

    // Generate ID from title and timestamp
    const hash = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 8);
    return `yad2_${hash}_${Date.now()}`;
  }

  /**
   * Generate the direct listing URL for a Yad2 property
   */
  private generateListingUrl(yad2Id: string, listingType: 'rent' | 'sale'): string {
    // Yad2 listing URLs follow this pattern:
    // https://www.yad2.co.il/realestate/item/{id}
    // If it's a generated ID (starts with yad2_), return empty string
    if (yad2Id.startsWith('yad2_')) {
      return '';
    }
    return `https://www.yad2.co.il/realestate/item/${yad2Id}`;
  }

  /**
   * Check if URL is a single listing or search results
   */
  private isListingUrl(url: string): boolean {
    return url.includes('/realestate/item/') || url.includes('/item/');
  }

  /**
   * Scrape a single Yad2 listing
   */
  async scrapeSingleListing(url: string): Promise<Yad2Listing | null> {
    try {
      console.log('Scraping single Yad2 listing:', url);

      // Extract the ID from the URL
      const idMatch = url.match(/item\/([a-zA-Z0-9]+)/);
      if (!idMatch) {
        throw new Error('Could not extract listing ID from URL');
      }
      const listingId = idMatch[1];

      // Use Firecrawl to scrape the listing page
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          timeout: 30000,
          waitFor: 2000,
          onlyMainContent: true,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Firecrawl API error: ${error}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('No data returned from Firecrawl');
      }

      // Parse the single listing with the known ID
      const listing = this.parseListing(result.data, url);
      if (listing) {
        // Override with the actual listing ID and clean URL
        listing.yad2_id = listingId;
        listing.listing_url = `https://www.yad2.co.il/realestate/item/${listingId}`;
      }

      return listing;
    } catch (error) {
      console.error('Error scraping single listing:', error);
      return null;
    }
  }

  /**
   * Check if a string is likely a city name
   */
  private isLikelyCity(text: string): boolean {
    // Common Israeli city name patterns and known cities
    const knownCities = [
      'תל אביב',
      'ירושלים',
      'חיפה',
      'באר שבע',
      'ראשון לציון',
      'פתח תקווה',
      'אשדוד',
      'נתניה',
      'חולון',
      'בני ברק',
      'רמת גן',
      'אשקלון',
      'רחובות',
      'בת ים',
      'הרצליה',
      'כפר סבא',
      'חדרה',
      'מודיעין',
      'רעננה',
      'רמלה',
      'לוד',
      'נהריה',
      'קריית אתא',
      'ראש העין',
      'הוד השרון',
      'גבעתיים',
      'עכו',
      'אילת',
      'רמת השרון',
      'יבנה',
      'טבריה',
      'קריית גת',
      'נס ציונה',
      'אור יהודה',
      'יהוד',
      'רמת ישי',
      'קריית ביאליק',
      'קריית מוצקין',
      'צפת',
      'כרמיאל',
      'קריית ים',
      'קריית שמונה',
      'מעלה אדומים',
      'אפרתה',
      'ביתר עילית',
      'גבעת שמואל',
      'זכרון יעקב',
      'עפולה',
      'יקנעם',
      'נשר',
      'אום אל פחם',
      'סכנין',
      'שפרעם',
      'טמרה',
      'טייבה',
      'כפר קאסם',
      'באקה אל גרביה',
      'קלנסווה',
      'מגדל העמק',
      'דימונה',
      'ערד',
      'קריית מלאכי',
      'אופקים',
      'שדרות',
      'נתיבות',
      'מצפה רמון',
      'מודיעין מכבים רעות',
      'ראש העין',
      'בת ים',
    ];

    // Check if the text matches any known city
    const normalizedText = text.trim();
    if (
      knownCities.some((city) => normalizedText.includes(city) || city.includes(normalizedText))
    ) {
      return true;
    }

    // Check if it looks like a city name pattern
    if (
      normalizedText.includes('קריית') ||
      normalizedText.includes('כפר') ||
      normalizedText.includes('גבעת') ||
      normalizedText.includes('רמת') ||
      normalizedText.includes('נווה') ||
      normalizedText.includes('גן') ||
      normalizedText.includes('מושב') ||
      normalizedText.includes('קיבוץ')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Parse price from Hebrew text
   */
  private parsePrice(priceText: string): { price: number; currency: string } {
    // Remove commas and extract numbers
    const cleanText = priceText.replace(/,/g, '');

    // Look for sale price patterns first (if we're scraping forsale)
    const salePatterns = [
      /₪\s*([\d,]+(?:\.\d+)?(?:,\d{3})*)/, // ₪ 1,500,000
      /([\d,]+(?:\.\d+)?(?:,\d{3})*)\s*₪/, // 1,500,000 ₪
      /מחיר[\s:]*₪?\s*([\d,]+)/, // מחיר: 1,500,000
      /₪[\s]*([\d]+(?:,\d{3})*(?:\.\d+)?)/, // ₪1,500,000
      /([\d]+(?:,\d{3})*(?:\.\d+)?)[\s]*₪/, // 1,500,000₪
    ];

    // Try sale patterns first
    for (const pattern of salePatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        // For sales, expect prices over 100,000
        if (price >= 100000) {
          return { price, currency: 'ILS' };
        }
      }
    }

    // Then try rental patterns
    const rentalPatterns = [
      /לחודש[\s:]*₪?\s*([\d,]+)/, // לחודש: 5,000
      /שכירות[\s:]*₪?\s*([\d,]+)/, // שכירות: 5,000
      /₪\s*(\d{1,5})\s*לחודש/, // ₪ 5000 לחודש
      /(\d{1,5})\s*₪\s*לחודש/, // 5000 ₪ לחודש
    ];

    for (const pattern of rentalPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price >= 1000 && price <= 50000) {
          return { price, currency: 'ILS' };
        }
      }
    }

    // If no specific pattern found, look for any number with ₪
    const generalPatterns = [
      /₪\s*([\d,]+)/, // ₪ followed by number
      /([\d,]+)\s*₪/, // number followed by ₪
      /(\d{4,})/, // Any 4+ digit number (likely a price)
    ];

    for (const pattern of generalPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        // Accept any reasonable price
        if (price >= 1000) {
          return { price, currency: 'ILS' };
        }
      }
    }

    return { price: 0, currency: 'ILS' };
  }

  /**
   * Extract room count from Hebrew text
   */
  private extractRooms(text: string): number {
    // Look for patterns like "3 חדרים" or "3.5 חדרים"
    const roomMatch = text.match(/(\d+(?:\.\d+)?)\s*חדרים/);
    if (roomMatch) {
      return parseFloat(roomMatch[1]);
    }
    return 0;
  }

  /**
   * Extract size in square meters
   */
  private extractSize(text: string): number | null {
    // Look for patterns like "80 מ״ר" or "80 מ"ר"
    const sizeMatch = text.match(/(\d+)\s*מ[״"״]ר/);
    if (sizeMatch) {
      return parseInt(sizeMatch[1]);
    }
    return null;
  }

  /**
   * Extract floor number
   */
  private extractFloor(text: string): number | null {
    // Look for patterns like "קומה 3" or "קומה 3 מתוך 5"
    const floorMatch = text.match(/קומה\s*(\d+)/);
    if (floorMatch) {
      return parseInt(floorMatch[1]);
    }
    return null;
  }

  /**
   * Detect amenities from Hebrew text
   */
  private detectAmenities(text: string): string[] {
    const amenities: string[] = [];
    const amenityMap = {
      חניה: ['חניה', 'חנייה'],
      מעלית: ['מעלית'],
      'ממ״ד': ['ממד', 'ממ"ד', 'מרחב מוגן'],
      מרפסת: ['מרפסת'],
      מזגן: ['מזגן', 'מיזוג'],
      משופצת: ['משופצת', 'שיפוץ'],
      מחסן: ['מחסן'],
      'גישה לנכים': ['גישה לנכים', 'נגיש'],
      'מרפסת שמש': ['מרפסת שמש'],
      'יחידת הורים': ['יחידת הורים'],
      'משופצת מהיסוד': ['משופצת מהיסוד'],
      'כניסה פרטית': ['כניסה פרטית'],
    };

    for (const [amenity, keywords] of Object.entries(amenityMap)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        amenities.push(amenity);
      }
    }

    return amenities;
  }

  /**
   * Parse a single listing from Firecrawl content
   */
  private parseListing(
    content: {
      markdown?: string;
      content?: string;
      html?: string;
      metadata?: Record<string, unknown>;
      screenshot?: string;
    },
    url: string
  ): Yad2Listing | null {
    try {
      // Firecrawl returns the scraped content directly
      const text = content.markdown || content.content || '';
      const html = content.html || '';
      const metadata = content.metadata || {};

      // Extract title from metadata or generate from content
      let title = '';
      if (metadata.title && typeof metadata.title === 'string') {
        title = metadata.title;
      } else {
        // Generate title from content
        const rooms = this.extractRooms(text);
        const location = text.match(/([א-ת\s]+),\s*([א-ת\s]+)/)?.[0] || 'מיקום לא ידוע';
        title = `${rooms || '?'} חדרים ב${location}`;
      }

      // Extract price
      const { price, currency } = this.parsePrice(text);

      // Extract other details
      const rooms = this.extractRooms(text);
      const size = this.extractSize(text);
      const floor = this.extractFloor(text);
      const amenities = this.detectAmenities(text);

      // Extract location - look for city names more carefully
      let location = 'Unknown';

      // Known property type words to exclude
      const propertyTypes = [
        'דירה',
        'בית',
        'פנטהאוז',
        'קוטג׳',
        'דופלקס',
        'גג',
        'מחסן',
        'חניה',
        'משרד',
        'דירת גן',
        'דירת גג',
        'מיני פנטהאוז',
        'סטודיו',
        'לופט',
      ];
      const neighborhoodTypes = ['שכונה', 'רובע', 'אזור', 'מתחם'];

      // Known neighborhood names (to exclude from city detection)
      const knownNeighborhoods = [
        'בבלי',
        'רמת אביב',
        'פלורנטין',
        'נווה צדק',
        'הדר יוסף',
        'צהלה',
        'רמת החייל',
        'יד אליהו',
        'בית הכרם',
        'רחביה',
        'קטמון',
        'תלפיות',
        'גילה',
        'רמת שלמה',
        'נווה יעקב',
        'פסגת זאב',
        'הדר',
        'נווה שאנן',
        'כרמל',
        'רמת שרת',
        'רמת הנשיא',
      ];

      // Try specific location patterns first
      const locationPatterns = [
        // Pattern: neighborhood name followed by city (e.g., "בבלי, תל אביב")
        /([א-ת\s]+),\s*([א-ת\s]+)(?:\s|$|,)/,
        // City pattern - look for known city indicators
        /(?:עיר|ישוב|יישוב|מיקום)[\s:]+([א-ת\s]+?)(?:\s|$|,)/,
        // Address with city - street, city format
        /רחוב\s+[א-ת\s]+,\s*([א-ת\s]+?)(?:\s|$|,)/,
        // Neighborhood in city pattern (e.g., "שכונת בבלי בתל אביב")
        /(?:שכונת|שכונה)\s+[א-ת\s]+(?:,\s*|\s+ב)([א-ת\s]+?)(?:\s|$|,)/,
        // Look for "ב" prefix which often precedes city names
        /\sב([א-ת]{2,}(?:\s+[א-ת]+)?)\s/,
      ];

      // First, check for the common pattern: "neighborhood, city"
      const neighborhoodCityMatch = text.match(/([א-ת\s]+),\s*([א-ת\s]+)/);
      if (neighborhoodCityMatch) {
        const part1 = neighborhoodCityMatch[1].trim();
        const part2 = neighborhoodCityMatch[2].trim();

        // Check if part1 is a known neighborhood and part2 is a city
        if (knownNeighborhoods.includes(part1) && this.isLikelyCity(part2)) {
          location = part2;
        } else if (this.isLikelyCity(part2) && !propertyTypes.includes(part2)) {
          location = part2;
        } else if (this.isLikelyCity(part1) && !propertyTypes.includes(part1)) {
          location = part1;
        }
      }

      // If still no location found, try other patterns
      if (location === 'Unknown') {
        for (const pattern of locationPatterns.slice(1)) {
          // Skip first pattern as we already tried it
          const match = text.match(pattern);
          if (match && match[1]) {
            const potentialLocation = match[1].trim();
            // Skip if it's a property type, neighborhood, or too short
            if (
              !propertyTypes.includes(potentialLocation) &&
              !knownNeighborhoods.includes(potentialLocation) &&
              potentialLocation.length > 2
            ) {
              // Prefer locations that are known cities
              if (this.isLikelyCity(potentialLocation)) {
                location = potentialLocation;
                break;
              }
            }
          }
        }
      }

      // Last resort: look for any known city in the text
      if (location === 'Unknown') {
        const knownCities = [
          'תל אביב',
          'ירושלים',
          'חיפה',
          'באר שבע',
          'ראשון לציון',
          'פתח תקווה',
          'אשדוד',
          'נתניה',
          'חולון',
          'בני ברק',
          'רמת גן',
          'אשקלון',
          'רחובות',
          'בת ים',
          'הרצליה',
          'כפר סבא',
        ];

        for (const city of knownCities) {
          if (text.includes(city)) {
            location = city;
            break;
          }
        }
      }

      // Extract images from content
      const imageUrls: string[] = [];

      // Look for image URLs in the HTML/markdown
      const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
      const urlPattern =
        /https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)/gi;

      // Additional patterns for Yad2's CDN domains
      const yad2ImagePattern =
        /https?:\/\/(?:images\.yad2\.co\.il|img\.yad2\.co\.il|cdn\.yad2\.co\.il|[^\/]+\.cloudinary\.com|[^\/]+\.imgix\.net)[^\s<>"{}|\\^`\[\]]*/gi;

      // Extract from HTML if available
      if (html) {
        let match;
        // First try the standard img src pattern
        while ((match = imgPattern.exec(html)) !== null) {
          if (match[1]) {
            // Don't filter by domain - capture all images first
            imageUrls.push(match[1]);
          }
        }

        // Also look for Yad2-specific image patterns in HTML
        const yad2Matches = html.match(yad2ImagePattern) || [];
        imageUrls.push(...yad2Matches);
      }

      // Also look for direct image URLs in text/markdown
      const textImages = text.match(urlPattern) || [];
      imageUrls.push(...textImages);

      // Look for Yad2-specific patterns in text
      const yad2TextImages = text.match(yad2ImagePattern) || [];
      imageUrls.push(...yad2TextImages);

      // Remove duplicates and filter out unwanted images
      let uniqueImages = [...new Set(imageUrls)];

      // Filter out placeholder/UI images but keep all others
      uniqueImages = uniqueImages
        .filter((url) => {
          // Decode HTML entities (e.g., &quot; to ")
          const decodedUrl = url
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

          // Remove base64 images and malformed URLs
          if (decodedUrl.startsWith('data:') || decodedUrl.includes('data:image')) return false;
          if (decodedUrl.startsWith('"') || decodedUrl.includes('base64')) return false;

          // Remove obvious UI/icon images
          if (
            decodedUrl.includes('/icon') ||
            decodedUrl.includes('/logo') ||
            decodedUrl.includes('/placeholder')
          )
            return false;

          // Ensure it's a valid URL
          try {
            new URL(decodedUrl);
            return true;
          } catch {
            return false;
          }
        })
        .map((url) => {
          // Decode HTML entities for the final URLs
          return url
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        });

      // Add screenshot as fallback if no images found
      if (uniqueImages.length === 0 && content.screenshot) {
        console.log('No images found, using screenshot as fallback');
        uniqueImages.push(content.screenshot);
      }

      // Log found images for debugging
      console.log(`Found ${uniqueImages.length} images for listing:`, uniqueImages.slice(0, 3));

      // Extract listing type from URL
      const listingType = url.includes('/realestate/forsale') ? 'sale' : 'rent';

      // Extract ID and generate URL
      const yad2Id = this.extractYad2Id(url, title);
      const directUrl = this.generateListingUrl(yad2Id, listingType);

      // Create listing object
      const listing: Yad2Listing = {
        yad2_id: yad2Id,
        title: title,
        price,
        currency,
        location,
        rooms,
        floor,
        size_sqm: size,
        description: text.substring(0, 1000),
        property_type: 'apartment', // Default, would need better detection
        image_urls: uniqueImages,
        amenities,
        listing_url: directUrl || url, // Use direct URL if available, otherwise use search URL
        listing_type: listingType,
        updated_at: new Date().toISOString(),
      };

      return listing;
    } catch (error) {
      console.error('Error parsing listing:', error);
      return null;
    }
  }

  /**
   * Scrape Yad2 - either a single listing or search results page
   */
  async scrapeYad2(url: string, maxListings: number = 10): Promise<Yad2Listing[]> {
    // Check if this is a single listing URL
    if (this.isListingUrl(url)) {
      const listing = await this.scrapeSingleListing(url);
      return listing ? [listing] : [];
    }

    // Otherwise, scrape search results
    return this.scrapeSearchResults(url, maxListings);
  }

  /**
   * Scrape Yad2 search results page
   */
  async scrapeSearchResults(url: string, maxListings: number = 10): Promise<Yad2Listing[]> {
    try {
      console.log('Scraping Yad2 URL:', url);

      // Extract listing type from URL
      const listingType = url.includes('/realestate/forsale') ? 'sale' : 'rent';

      // Use Firecrawl to scrape the search results page
      const response = await fetch(`${FIRECRAWL_API_URL}/scrape`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          timeout: 60000, // Increase timeout to 60 seconds
          waitFor: 2000, // Reduce initial wait
          onlyMainContent: true, // Focus on main content only
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Firecrawl API error: ${error}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('No data returned from Firecrawl');
      }

      // Firecrawl returns data directly, not nested
      const content = result.data;
      const listings: Yad2Listing[] = [];

      // Parse Yad2 search results page
      console.log('Parsing Yad2 content...');

      // Try to extract multiple listings from the page
      const markdown = content.markdown || '';
      const html = content.html || '';

      // Split content into potential listing blocks
      // Yad2 listings typically have consistent patterns
      const listingBlocks = this.extractListingBlocks(markdown, html, maxListings);

      // Process all found blocks or up to maxListings
      const blocksToProcess = maxListings > 0 ? listingBlocks.slice(0, maxListings) : listingBlocks;
      console.log(
        `Processing ${blocksToProcess.length} out of ${listingBlocks.length} total blocks found`
      );

      for (const block of blocksToProcess) {
        const listing = this.parseListingBlock(block, url, listingType);
        if (listing) {
          listings.push(listing);
        }
      }

      // If no individual listings found, try alternative parsing
      if (listings.length === 0) {
        console.log(
          'No individual listings found with standard parsing, trying alternative method...'
        );

        // Try parsing the entire markdown content as potential listings
        const lines = markdown.split('\n');
        let currentListing: any = {};
        let hasBasicInfo = false;

        for (const line of lines) {
          // Look for price patterns
          if (line.match(/₪[\s\d,]+|[\d,]+\s*₪/)) {
            if (hasBasicInfo && currentListing.price) {
              // We might have a complete listing, try to parse it
              const listingText = Object.values(currentListing).join(' ');
              const listing = this.parseListingBlock(listingText, url, listingType);
              if (listing) {
                listings.push(listing);
              }
            }
            currentListing = { price: line };
            hasBasicInfo = false;
          }

          // Look for rooms
          if (line.includes('חדרים')) {
            currentListing.rooms = line;
            hasBasicInfo = true;
          }

          // Look for location patterns
          if (line.match(/^[א-ת\s,]+$/) && line.length > 5 && line.length < 50) {
            currentListing.location = line;
          }

          // Accumulate description
          if (currentListing.price) {
            currentListing.description = (currentListing.description || '') + ' ' + line;
          }
        }

        // Don't return empty array if it looks like a search page
        if (listings.length === 0 && markdown.includes('נדל"ן') && markdown.includes('מודעות')) {
          console.log('This appears to be a search results page, not individual listings');
          return [];
        }
      }

      console.log(`Found ${listings.length} listings`);
      
      // Limit to 10 listings for testing
      const limitedListings = listings.slice(0, 10);
      if (limitedListings.length < listings.length) {
        console.log(`Limited to ${limitedListings.length} listings for testing`);
      }
      
      return limitedListings;
    } catch (error) {
      console.error('Error scraping Yad2:', error);
      throw error;
    }
  }

  /**
   * Extract listing blocks from page content
   */
  private extractListingBlocks(markdown: string, html: string = '', maxBlocks: number = 10): string[] {
    const blocks: string[] = [];

    // Skip if this looks like a search results page without listings
    if (markdown.includes('נדל"ן למכירה') && markdown.includes('אלפי מודעות')) {
      console.log('This appears to be a search page header, not individual listings');
      return [];
    }

    // Try to find feed items in HTML first (more reliable)
    if (html) {
      // First, try to extract all listing URLs directly from the HTML
      // Yad2 listing URLs have the pattern: /realestate/item/{id}
      const listingUrlPattern = /href="([^"]*\/realestate\/item\/[a-zA-Z0-9]+)[^"]*"/gi;
      const urlMatches = [...html.matchAll(listingUrlPattern)];
      const foundListingUrls = new Map<string, string>();

      for (const match of urlMatches) {
        const fullUrl = match[1];
        const idMatch = fullUrl.match(/item\/([a-zA-Z0-9]+)/);
        if (idMatch) {
          const itemId = idMatch[1];
          // Store the first occurrence of each unique ID
          if (!foundListingUrls.has(itemId)) {
            foundListingUrls.set(itemId, fullUrl);
          }
        }
      }

      console.log(`Found ${foundListingUrls.size} unique listing URLs in HTML`);
      
      // Limit early for efficiency
      const limitedUrls = Array.from(foundListingUrls.entries()).slice(0, maxBlocks);
      console.log(`Processing first ${limitedUrls.length} listings`);

      // Now try to find the feed items and match them with their IDs
      const itemsWithIds: Array<{ html: string; itemId?: string; listingUrl?: string }> = [];

      // Look for feed item blocks that might contain these listing URLs
      const feedItemPattern =
        /<div[^>]*(?:class="[^"]*feed[^"]*item[^"]*"|data-feed-item)[^>]*>[\s\S]*?(?=<div[^>]*(?:class="[^"]*feed[^"]*item[^"]*"|data-feed-item)|$)/gi;
      const feedMatches = [...html.matchAll(feedItemPattern)];

      for (const match of feedMatches) {
        const itemHtml = match[0];

        // Try to find a listing URL within this feed item
        let itemId: string | undefined;
        let listingUrl: string | undefined;

        for (const [id, url] of foundListingUrls) {
          if (itemHtml.includes(`/item/${id}`)) {
            itemId = id;
            listingUrl = url;
            break;
          }
        }

        itemsWithIds.push({
          html: itemHtml,
          itemId,
          listingUrl,
        });
      }

      // If we didn't find feed items but have URLs, create minimal items from the URLs
      if (itemsWithIds.length === 0 && foundListingUrls.size > 0) {
        console.log('No feed items found, using listing URLs directly');
        for (const [itemId, listingUrl] of foundListingUrls) {
          itemsWithIds.push({
            html: `[LISTING_URL:${listingUrl}][ITEM_ID:${itemId}]`,
            itemId,
            listingUrl,
          });
        }
      }

      if (itemsWithIds.length > 0) {
        console.log(`Found ${itemsWithIds.length} potential feed items in HTML`);
        // Convert HTML to text for each match and preserve item IDs AND images
        const textBlocks = itemsWithIds
          .map((item) => {
            // Extract text content more carefully
            let text = item.html;
            const itemId = item.itemId;

            // Extract images BEFORE removing HTML tags
            const imageUrls: string[] = [];
            const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
            let imgMatch;
            while ((imgMatch = imgPattern.exec(text)) !== null) {
              if (imgMatch[1] && !imgMatch[1].startsWith('data:')) {
                imageUrls.push(imgMatch[1]);
              }
            }

            // Also look for background images in style attributes
            const bgImagePattern = /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
            let bgMatch;
            while ((bgMatch = bgImagePattern.exec(text)) !== null) {
              if (bgMatch[1] && !bgMatch[1].startsWith('data:')) {
                imageUrls.push(bgMatch[1]);
              }
            }

            // Extract prices first (they might be in specific elements)
            const priceMatches = text.match(/₪[\s]*[\d,]+|[\d,]+[\s]*₪/g);

            // Remove script and style content
            text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

            // Extract text from specific elements that might contain data
            const importantText: string[] = [];

            // Extract text from spans, divs, etc
            const textPattern = />([^<]+)</g;
            let textMatch;
            while ((textMatch = textPattern.exec(text)) !== null) {
              const content = textMatch[1].trim();
              if (content && !content.match(/^[\s\n]*$/)) {
                importantText.push(content);
              }
            }

            // Reconstruct with prices prominently placed
            let reconstructed = importantText.join(' ');
            if (priceMatches && priceMatches.length > 0) {
              reconstructed = priceMatches[0] + ' ' + reconstructed;
            }

            // Add item ID and URL as metadata if found
            if (itemId) {
              reconstructed = `[ITEM_ID:${itemId}] ` + reconstructed;
            }
            if (item.listingUrl) {
              reconstructed = `[LISTING_URL:${item.listingUrl}] ` + reconstructed;
            }

            // Add image URLs to the reconstructed text
            if (imageUrls.length > 0) {
              reconstructed += ' ' + imageUrls.map((url) => `[IMG:${url}]`).join(' ');
            }

            return reconstructed
              .replace(/\s+/g, ' ') // Normalize whitespace
              .replace(/\\+/g, '') // Remove backslashes
              .replace(/\*+/g, '') // Remove asterisks
              .trim();
          })
          .filter((text) => text.length > 50 && text.match(/₪|חדרים/)); // Must have price or rooms

        if (textBlocks.length > 0) {
          console.log(`Converted ${textBlocks.length} HTML blocks to text`);
          // Log first few blocks for debugging
          textBlocks.slice(0, 3).forEach((block, i) => {
            console.log(`Sample block ${i + 1}: ${block.substring(0, 150)}...`);
          });
          return textBlocks;
        }
      }
    }

    // Try to split by common patterns in Yad2 listings
    // Look for price patterns as delimiters
    const pricePattern = /₪[\s\d,]+|[\d,]+\s*₪/g;
    const parts = markdown.split(pricePattern);

    // Each part might be a listing
    for (let i = 0; i < parts.length - 1; i++) {
      const block = parts[i] + (markdown.match(pricePattern)?.[i] || '');
      if (block.length > 50 && block.includes('חדרים')) {
        // Must have rooms mentioned
        blocks.push(block);
      }
    }

    // If no blocks found, try line-based splitting
    if (blocks.length === 0) {
      const lines = markdown.split('\n');
      let currentBlock = '';
      let hasPrice = false;
      let hasRooms = false;

      for (const line of lines) {
        currentBlock += line + '\n';

        if (pricePattern.test(line)) hasPrice = true;
        if (line.includes('חדרים')) hasRooms = true;

        // If we find a separator and have essential info, consider it end of block
        if (
          (line.includes('---') || line.trim() === '' || pricePattern.test(line)) &&
          hasPrice &&
          hasRooms
        ) {
          if (currentBlock.length > 100) {
            blocks.push(currentBlock);
            currentBlock = '';
            hasPrice = false;
            hasRooms = false;
          }
        }
      }
    }

    return blocks;
  }

  /**
   * Parse a single listing block
   */
  private parseListingBlock(
    block: string,
    baseUrl: string,
    listingType: 'rent' | 'sale'
  ): Yad2Listing | null {
    try {
      // Try to extract item ID and listing URL from block metadata
      let itemId: string | undefined;
      let listingUrl: string | undefined;

      const itemIdMatch = block.match(/\[ITEM_ID:([^\]]+)\]/);
      if (itemIdMatch) {
        itemId = itemIdMatch[1];
        block = block.replace(itemIdMatch[0], '').trim();
      }

      const listingUrlMatch = block.match(/\[LISTING_URL:([^\]]+)\]/);
      if (listingUrlMatch) {
        listingUrl = listingUrlMatch[1];
        block = block.replace(listingUrlMatch[0], '').trim();
      }
      // Extract price
      const { price, currency } = this.parsePrice(block);
      if (!price) {
        console.log('No price found in block:', block.substring(0, 100));
        return null; // No price means probably not a listing
      }

      // Extract rooms
      const rooms = this.extractRooms(block);
      const size = this.extractSize(block);
      const floor = this.extractFloor(block);
      const amenities = this.detectAmenities(block);

      // Extract location - use same logic as parseListing
      let location = 'Unknown';

      // Known property type words to exclude
      const propertyTypes = [
        'דירה',
        'בית',
        'פנטהאוז',
        'קוטג׳',
        'דופלקס',
        'גג',
        'מחסן',
        'חניה',
        'משרד',
        'דירת גן',
        'דירת גג',
        'מיני פנטהאוז',
        'סטודיו',
        'לופט',
      ];

      // Known neighborhood names (to exclude from city detection)
      const knownNeighborhoods = [
        'בבלי',
        'רמת אביב',
        'פלורנטין',
        'נווה צדק',
        'הדר יוסף',
        'צהלה',
        'רמת החייל',
        'יד אליהו',
        'בית הכרם',
        'רחביה',
        'קטמון',
        'תלפיות',
        'גילה',
        'רמת שלמה',
        'נווה יעקב',
        'פסגת זאב',
        'הדר',
        'נווה שאנן',
        'כרמל',
        'רמת שרת',
        'רמת הנשיא',
      ];

      // Try specific location patterns first
      const locationPatterns = [
        // Pattern: neighborhood name followed by city (e.g., "בבלי, תל אביב")
        /([א-ת\s]+),\s*([א-ת\s]+)(?:\s|$|,)/,
        // City pattern - look for known city indicators
        /(?:עיר|ישוב|יישוב|מיקום)[\s:]+([א-ת\s]+?)(?:\s|$|,)/,
        // Address with city - street, city format
        /רחוב\s+[א-ת\s]+,\s*([א-ת\s]+?)(?:\s|$|,)/,
        // Neighborhood in city pattern
        /(?:שכונת|שכונה)\s+[א-ת\s]+(?:,\s*|\s+ב)([א-ת\s]+?)(?:\s|$|,)/,
        // Look for "ב" prefix which often precedes city names
        /\sב([א-ת]{2,}(?:\s+[א-ת]+)?)\s/,
        // Direct city names after certain keywords
        /(?:להשכרה|למכירה|למכר)\s+ב([א-ת\s]+?)(?:\s|$|,)/,
      ];

      // First, check for the common pattern: "neighborhood, city"
      const neighborhoodCityMatch = block.match(/([א-ת\s]+),\s*([א-ת\s]+)/);
      if (neighborhoodCityMatch) {
        const part1 = neighborhoodCityMatch[1].trim();
        const part2 = neighborhoodCityMatch[2].trim();

        // Check if part1 is a known neighborhood and part2 is a city
        if (knownNeighborhoods.includes(part1) && this.isLikelyCity(part2)) {
          location = part2;
        } else if (this.isLikelyCity(part2) && !propertyTypes.includes(part2)) {
          location = part2;
        } else if (this.isLikelyCity(part1) && !propertyTypes.includes(part1)) {
          location = part1;
        }
      }

      // If still no location found, try other patterns
      if (location === 'Unknown') {
        for (const pattern of locationPatterns.slice(1)) {
          // Skip first pattern as we already tried it
          const match = block.match(pattern);
          if (match && match[1]) {
            const potentialLocation = match[1].trim();
            // Skip if it's a property type, neighborhood, or too short
            if (
              !propertyTypes.includes(potentialLocation) &&
              !knownNeighborhoods.includes(potentialLocation) &&
              potentialLocation.length > 2
            ) {
              // Prefer locations that are known cities
              if (this.isLikelyCity(potentialLocation)) {
                location = potentialLocation;
                break;
              }
            }
          }
        }
      }

      // Last resort: look for any known city in the text
      if (location === 'Unknown') {
        const knownCities = [
          'תל אביב',
          'ירושלים',
          'חיפה',
          'באר שבע',
          'ראשון לציון',
          'פתח תקווה',
          'אשדוד',
          'נתניה',
          'חולון',
          'בני ברק',
          'רמת גן',
          'אשקלון',
          'רחובות',
          'בת ים',
          'הרצליה',
          'כפר סבא',
        ];

        for (const city of knownCities) {
          if (block.includes(city)) {
            location = city;
            break;
          }
        }
      }

      // Generate a title from the content WITHOUT price
      const title = `${rooms || '?'} חדרים ב${location}`;

      // Try to extract images from the block
      const blockImages: string[] = [];

      // First, extract images from our [IMG:] tags
      const imgTagPattern = /\[IMG:([^\]]+)\]/g;
      let imgTagMatch;
      while ((imgTagMatch = imgTagPattern.exec(block)) !== null) {
        if (imgTagMatch[1]) {
          blockImages.push(imgTagMatch[1]);
        }
      }

      // Also look for any direct image URLs
      const imgUrlPattern =
        /https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP)/gi;
      const foundUrls = block.match(imgUrlPattern) || [];

      // Add all image URLs without filtering by domain
      // Yad2 may use various CDN services
      blockImages.push(
        ...foundUrls.filter((url) => {
          // Only filter out obvious non-listing images
          return (
            !url.includes('/icon') &&
            !url.includes('/logo') &&
            !url.includes('/placeholder') &&
            !url.startsWith('[IMG:')
          );
        })
      );

      // Remove duplicates and decode HTML entities
      const uniqueImages = [...new Set(blockImages)]
        .filter((url) => {
          // Decode HTML entities
          const decodedUrl = url
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');

          // Remove base64 images and malformed URLs
          if (decodedUrl.startsWith('data:') || decodedUrl.includes('data:image')) return false;
          if (decodedUrl.startsWith('"') || decodedUrl.includes('base64')) return false;

          // Ensure it's a valid URL
          try {
            new URL(decodedUrl);
            return true;
          } catch {
            return false;
          }
        })
        .map((url) => {
          // Decode HTML entities for the final URLs
          return url
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        });

      console.log(
        `Found ${uniqueImages.length} images in listing block:`,
        uniqueImages.slice(0, 2)
      );

      // Use extracted item ID if available, otherwise generate one
      const yad2Id = itemId || this.extractYad2Id(baseUrl + Date.now(), title);

      // Use the extracted listing URL if available, otherwise generate from ID
      let directUrl = '';
      if (listingUrl) {
        // Ensure it's a full URL
        directUrl = listingUrl.startsWith('http')
          ? listingUrl
          : `https://www.yad2.co.il${listingUrl}`;
      } else if (!yad2Id.startsWith('yad2_')) {
        directUrl = this.generateListingUrl(yad2Id, listingType);
      }

      return {
        yad2_id: yad2Id,
        title,
        price,
        currency,
        location,
        rooms: rooms || 0,
        floor,
        size_sqm: size,
        description: block.substring(0, 500),
        property_type: 'apartment',
        image_urls: uniqueImages,
        amenities,
        listing_url: directUrl || baseUrl, // Use direct URL if available, otherwise fallback to search URL
        listing_type: listingType,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error parsing listing block:', error);
      return null;
    }
  }

  /**
   * Save listing to Supabase with duplicate detection
   */
  async saveListing(listing: Yad2Listing): Promise<'created' | 'updated' | 'duplicate' | 'error'> {
    try {
      // Extract location coordinates if possible (for now, using a placeholder)
      // In production, you'd use a geocoding service
      const propertyInput: PropertyInput = {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        currency: listing.currency,
        address: listing.location,
        city: listing.location.includes(',')
          ? listing.location.split(',')[1].trim()
          : listing.location,
        phone: listing.phone_number,
        contactName: listing.contact_name,
        images: listing.image_urls,
        amenities: listing.amenities,
        sourcePlatform: 'yad2',
        sourceId: listing.yad2_id,
        sourceUrl: listing.listing_url,
        metadata: {
          rooms: listing.rooms,
          floor: listing.floor,
          size_sqm: listing.size_sqm,
          property_type: listing.property_type,
        },
      };

      // Check for duplicates
      const duplicateResult = await duplicateDetector.checkForDuplicate(propertyInput);

      if (duplicateResult.isDuplicate && duplicateResult.action === 'merge') {
        console.log(`Duplicate found for "${listing.title}", merging with existing listing...`);
        await duplicateDetector.mergeProperties(duplicateResult.matchedProperty!.id, propertyInput);
        return 'duplicate';
      }

      if (duplicateResult.action === 'update') {
        console.log(`Exact match found for "${listing.title}", updating...`);
        // Update existing listing with same source - use properties table
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            title: listing.title,
            description: listing.description,
            price_per_month: listing.price,
            currency: listing.currency,
            location_text: listing.location,
            bedrooms: Math.floor(listing.rooms - 1),
            property_type: listing.property_type,
            last_seen_at: new Date().toISOString(),
          })
          .eq('source_id', listing.yad2_id)
          .eq('source_platform', 'yad2');

        if (updateError) {
          console.error('Error updating listing:', updateError);
          throw updateError;
        }
        return 'updated';
      }

      if (duplicateResult.action === 'review') {
        console.log(
          `Potential duplicate for "${listing.title}" queued for review (score: ${duplicateResult.score})`
        );
      }

      // Only create new listing if not a duplicate
      if (duplicateResult.action === 'create' || duplicateResult.action === 'review') {
        // Insert new listing
        const { data: property, error: insertError } = await supabase
          .from('properties')
          .insert({
            facebook_id: listing.yad2_id, // Using facebook_id field for any external ID
            title: listing.title,
            description: listing.description,
            price_per_month: listing.price,
            currency: listing.currency,
            location_text: listing.location,
            bedrooms: Math.floor(listing.rooms - 1),
            property_type: listing.property_type,
            is_active: true,
            listing_type: listing.listing_type,
            duplicate_status: duplicateResult.action === 'review' ? 'review' : 'unique',
            source_platform: 'yad2',
            source_id: listing.yad2_id,
            // Only store source_url if it's an actual listing URL, not a search URL
            source_url: listing.listing_url.includes('/item/')
              ? this.normalizeUrl(listing.listing_url)
              : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Upload images to UploadThing first, then save references
        if (property && listing.image_urls.length > 0) {
          try {
            // Upload each image to UploadThing
            const uploadPromises = listing.image_urls.slice(0, 5).map(async (imageUrl, index) => {
              try {
                console.log(
                  `Uploading image ${index + 1}/${listing.image_urls.length} to UploadThing...`
                );

                // Fetch the image from Yad2
                const response = await fetch(imageUrl);
                if (!response.ok) {
                  console.warn(`Failed to fetch image from ${imageUrl}: ${response.statusText}`);
                  throw new Error(`Failed to fetch image: ${response.statusText}`);
                }

                const blob = await response.blob();
                const buffer = Buffer.from(await blob.arrayBuffer());
                const filename = `property-${property.id}-${index}-${Date.now()}.jpg`;

                // Create a File object from the buffer
                const file = new File([buffer], filename, { type: 'image/jpeg' });

                // Upload to UploadThing
                const uploadResult = await utapi.uploadFiles(file);

                // Check if upload was successful
                if ('data' in uploadResult && uploadResult.data) {
                  // Use the new ufsUrl property instead of deprecated url
                  const uploadedUrl = uploadResult.data.ufsUrl || (uploadResult.data as any).url;

                  if (uploadedUrl) {
                    console.log(`✅ Successfully uploaded image ${index + 1} to: ${uploadedUrl}`);
                    return {
                      property_id: property.id,
                      image_url: uploadedUrl,
                      image_order: index,
                      is_primary: index === 0,
                    };
                  }
                }

                // Handle error case
                const errorMessage =
                  'error' in uploadResult ? (uploadResult as any).error : 'Unknown error';
                console.error(`❌ UploadThing failed for image ${index + 1}:`, errorMessage);
                throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Upload failed');
              } catch (error) {
                console.error(`Failed to upload image ${index}:`, error);
                // If upload fails, use original URL as fallback
                return {
                  property_id: property.id,
                  image_url: imageUrl,
                  image_order: index,
                  is_primary: index === 0,
                };
              }
            });

            const uploadedImages = await Promise.all(uploadPromises);
            const validImages = uploadedImages.filter((img) => img !== null);

            if (validImages.length > 0) {
              const { error: imageError } = await supabase
                .from('property_images')
                .insert(validImages);
              if (imageError) throw imageError;
            }
          } catch (error) {
            console.error('Error uploading images:', error);
            // Fallback: save original URLs if upload fails
            const fallbackImages = listing.image_urls.slice(0, 5).map((url, index) => ({
              property_id: property.id,
              image_url: url,
              image_order: index,
              is_primary: index === 0,
            }));
            const { error: imageError } = await supabase
              .from('property_images')
              .insert(fallbackImages);
            if (imageError) throw imageError;
          }
        } else if (property && listing.image_urls.length === 0) {
          // No images found, use UploadThing hosted placeholder
          const placeholderImage = {
            property_id: property.id,
            image_url: 'https://utfs.io/f/ErznS8cNMHlPwNeWJbGFASWOq8cpgZKI6N2mDBoGVLrsvlfC',
            image_order: 0,
            is_primary: true,
          };
          const { error: imageError } = await supabase
            .from('property_images')
            .insert(placeholderImage);
          if (imageError) throw imageError;
        }

        // Insert amenities
        if (property && listing.amenities.length > 0) {
          // Get amenity IDs
          const { data: amenityData } = await supabase.from('amenities').select('id, name');

          if (amenityData) {
            const amenityMap = new Map(amenityData.map((a) => [a.name, a.id]));

            const amenityInserts = listing.amenities
              .filter((name) => amenityMap.has(name))
              .map((name) => ({
                property_id: property.id,
                amenity_id: amenityMap.get(name)!,
              }));

            if (amenityInserts.length > 0) {
              const { error: amenityError } = await supabase
                .from('property_amenities')
                .insert(amenityInserts);

              if (amenityError) throw amenityError;
            }
          }
        }

        // Insert scrape metadata
        if (property) {
          const { error: metadataError } = await supabase.from('scrape_metadata').insert({
            property_id: property.id,
            source_url: listing.listing_url,
            source_type: 'yad2',
            source_id: listing.yad2_id,
            source_name: 'Yad2',
          });

          if (metadataError) throw metadataError;
        }
      }

      console.log(`Successfully saved listing: ${listing.title}`);
      return 'created';
    } catch (error) {
      console.error('Error saving listing:', error);
      throw error;
    }
  }

  /**
   * Scrape and save listings from Yad2
   */
  async scrapeAndSave(
    url: string,
    maxListings: number = 50
  ): Promise<{
    success: boolean;
    listings: number;
    created: number;
    updated: number;
    duplicates: number;
    message: string;
    errors?: string[];
  }> {
    try {
      const listings = await this.scrapeYad2(url, maxListings);
      let savedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;
      let duplicateCount = 0;
      const errors: string[] = [];

      for (const listing of listings) {
        try {
          // Validate price before saving
          if (listing.price > 99999999) {
            console.warn(`Price too large for listing ${listing.title}: ${listing.price}`);
            listing.price = 0; // Set to 0 to indicate price needs review
          }

          const result = await this.saveListing(listing);

          switch (result) {
            case 'created':
              createdCount++;
              savedCount++;
              break;
            case 'updated':
              updatedCount++;
              savedCount++;
              break;
            case 'duplicate':
              duplicateCount++;
              break;
          }
        } catch (error) {
          // Better error logging
          let errorMsg = `Failed to save "${listing.title}": `;
          if (error instanceof Error) {
            errorMsg += error.message;
            // Log the full error object for debugging
            console.error('Full error:', error);
          } else {
            errorMsg += 'Unknown error';
            console.error('Error object:', error);
          }
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: savedCount > 0,
        listings: savedCount,
        created: createdCount,
        updated: updatedCount,
        duplicates: duplicateCount,
        message: `Successfully processed ${listings.length} listings from Yad2`,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        listings: 0,
        created: 0,
        updated: 0,
        duplicates: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
