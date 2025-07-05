import { createClient } from '@supabase/supabase-js';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
   * Parse price from Hebrew text
   */
  private parsePrice(priceText: string): { price: number; currency: string } {
    // Remove commas and extract numbers
    const cleanText = priceText.replace(/,/g, '');

    // Since we're scraping rentals, prioritize rental price patterns first
    const rentalPatterns = [
      /לחודש[\s:]*₪?\s*([\d,]+)/, // לחודש: 5,000
      /שכירות[\s:]*₪?\s*([\d,]+)/, // שכירות: 5,000
      /₪\s*(\d{1,5})\s*לחודש/, // ₪ 5000 לחודש
      /(\d{1,5})\s*₪\s*לחודש/, // 5000 ₪ לחודש
      /₪\s*(\d{1,5})(?:\s|$)/, // ₪ 5000 (standalone rental price)
      /(\d{1,5})\s*₪(?:\s|$)/, // 5000 ₪ (standalone rental price)
    ];

    for (const pattern of rentalPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price >= 1000 && price <= 50000) {
          // Reasonable rental range
          return { price, currency: 'ILS' };
        }
      }
    }

    // If no rental pattern found, look for any reasonable price
    const generalPatterns = [
      /₪\s*([\d,]+(?:\.\d+)?(?:,\d{3})*)/, // ₪ 1,500
      /([\d,]+(?:\.\d+)?(?:,\d{3})*)\s*₪/, // 1,500 ₪
      /(\d{1,5})/, // Any 1-5 digit number (likely rental)
    ];

    for (const pattern of generalPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        // For rentals, cap at reasonable monthly rent
        if (price >= 1000 && price <= 50000) {
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

      // Extract title
      const title = metadata.title || text.substring(0, 100);

      // Extract price
      const { price, currency } = this.parsePrice(text);

      // Extract other details
      const rooms = this.extractRooms(text);
      const size = this.extractSize(text);
      const floor = this.extractFloor(text);
      const amenities = this.detectAmenities(text);

      // Extract location (simplified - would need more sophisticated parsing)
      let location = 'Unknown';
      const locationMatch = text.match(/([א-ת\s]+),\s*([א-ת\s]+)/);
      if (locationMatch) {
        location = `${locationMatch[1]}, ${locationMatch[2]}`;
      }

      // Extract images from content
      const imageUrls: string[] = [];

      // Look for image URLs in the HTML/markdown
      const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
      const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:jpg|jpeg|png|gif|webp)/gi;

      // Extract from HTML if available
      if (html) {
        let match;
        while ((match = imgPattern.exec(html)) !== null) {
          if (match[1] && (match[1].includes('yad2') || match[1].includes('images'))) {
            imageUrls.push(match[1]);
          }
        }
      }

      // Also look for direct image URLs in text
      const textImages = text.match(urlPattern) || [];
      imageUrls.push(
        ...textImages.filter(
          (url: string) => url.includes('yad2') || url.includes('images') || url.includes('cdn')
        )
      );

      // Add screenshot as fallback if no images found
      if (imageUrls.length === 0 && content.screenshot) {
        imageUrls.push(content.screenshot);
      }

      // Remove duplicates and log found images
      const uniqueImages = [...new Set(imageUrls)];
      if (uniqueImages.length > 0) {
        console.log(`Found ${uniqueImages.length} images for listing`);
      }

      // Create listing object
      const listing: Yad2Listing = {
        yad2_id: this.extractYad2Id(url, title.toString()),
        title: title.toString(),
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
        listing_url: url,
        updated_at: new Date().toISOString(),
      };

      return listing;
    } catch (error) {
      console.error('Error parsing listing:', error);
      return null;
    }
  }

  /**
   * Scrape Yad2 search results page
   */
  async scrapeYad2(url: string, maxListings: number = 10): Promise<Yad2Listing[]> {
    try {
      console.log('Scraping Yad2 URL:', url);

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
      const listingBlocks = this.extractListingBlocks(markdown, html);

      for (const block of listingBlocks.slice(0, maxListings)) {
        const listing = this.parseListingBlock(block, url);
        if (listing) {
          listings.push(listing);
        }
      }

      // If no individual listings found, try to parse as a single listing
      if (listings.length === 0) {
        console.log('No individual listings found, parsing as single listing...');
        const listing = this.parseListing(content, url);
        if (listing) {
          listings.push(listing);
        }
      }

      console.log(`Found ${listings.length} listings`);
      return listings;
    } catch (error) {
      console.error('Error scraping Yad2:', error);
      throw error;
    }
  }

  /**
   * Extract listing blocks from page content
   */
  private extractListingBlocks(markdown: string, html: string = ''): string[] {
    const blocks: string[] = [];

    // Try to split by common patterns in Yad2 listings
    // Look for price patterns as delimiters
    const pricePattern = /₪[\s\d,]+|[\d,]+\s*₪/g;
    const parts = markdown.split(pricePattern);

    // Each part might be a listing
    for (let i = 0; i < parts.length - 1; i++) {
      const block = parts[i] + (markdown.match(pricePattern)?.[i] || '');
      if (block.length > 50) {
        // Minimum content for a listing
        blocks.push(block);
      }
    }

    // If no blocks found, try line-based splitting
    if (blocks.length === 0) {
      const lines = markdown.split('\n');
      let currentBlock = '';

      for (const line of lines) {
        currentBlock += line + '\n';

        // If we find a price or separator, consider it end of block
        if (pricePattern.test(line) || line.includes('---') || line.trim() === '') {
          if (currentBlock.length > 100) {
            blocks.push(currentBlock);
            currentBlock = '';
          }
        }
      }
    }

    return blocks;
  }

  /**
   * Parse a single listing block
   */
  private parseListingBlock(block: string, baseUrl: string): Yad2Listing | null {
    try {
      // Extract price
      const { price, currency } = this.parsePrice(block);
      if (!price) return null; // No price means probably not a listing

      // Extract rooms
      const rooms = this.extractRooms(block);
      const size = this.extractSize(block);
      const floor = this.extractFloor(block);
      const amenities = this.detectAmenities(block);

      // Extract location - look for neighborhood/city patterns
      let location = 'Unknown';
      const locationPatterns = [
        /שכונת\s+([א-ת\s]+)/,
        /רחוב\s+([א-ת\s]+)/,
        /([א-ת\s]+),\s*([א-ת\s]+)/,
      ];

      for (const pattern of locationPatterns) {
        const match = block.match(pattern);
        if (match) {
          location = match[0];
          break;
        }
      }

      // Generate a title from the content
      const title = `${rooms || '?'} חדרים ב${location} - ${price} ₪`;

      // Try to extract images from the block
      const blockImages: string[] = [];
      const imgUrlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:jpg|jpeg|png|gif|webp)/gi;
      const foundUrls = block.match(imgUrlPattern) || [];
      blockImages.push(
        ...foundUrls.filter(
          (url) => url.includes('yad2') || url.includes('images') || url.includes('cdn')
        )
      );

      return {
        yad2_id: this.extractYad2Id(baseUrl + Date.now(), title),
        title,
        price,
        currency,
        location,
        rooms: rooms || 0,
        floor,
        size_sqm: size,
        description: block.substring(0, 500),
        property_type: 'apartment',
        image_urls: blockImages,
        amenities,
        listing_url: baseUrl,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error parsing listing block:', error);
      return null;
    }
  }

  /**
   * Save listing to Supabase
   */
  async saveListing(listing: Yad2Listing): Promise<void> {
    try {
      // Check if listing already exists
      const { data: existing } = await supabase
        .from('rentals')
        .select('id')
        .eq('facebook_id', listing.yad2_id)
        .single();

      if (existing) {
        console.log(`Listing ${listing.yad2_id} already exists, updating...`);

        // Update existing listing
        const { error: updateError } = await supabase
          .from('rentals')
          .update({
            title: listing.title,
            description: listing.description,
            price_per_month: listing.price,
            currency: listing.currency,
            location_text: listing.location,
            bedrooms: Math.floor(listing.rooms - 1), // Israeli convention: rooms include living room
            property_type: listing.property_type,
          })
          .eq('facebook_id', listing.yad2_id);

        if (updateError) throw updateError;
      } else {
        // Insert new listing
        const { data: rental, error: insertError } = await supabase
          .from('rentals')
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
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Insert images
        if (rental) {
          const imagesToInsert =
            listing.image_urls.length > 0
              ? listing.image_urls
              : ['https://py5iwgffjd.ufs.sh/f/ErznS8cNMHlPwNeWJbGFASWOq8cpgZKI6N2mDBoGVLrsvlfC']; // Fallback

          const imageInserts = imagesToInsert.slice(0, 5).map((url, index) => ({
            rental_id: rental.id,
            image_url: url,
            image_order: index,
            is_primary: index === 0,
          }));

          const { error: imageError } = await supabase.from('rental_images').insert(imageInserts);

          if (imageError) throw imageError;
        }

        // Insert amenities
        if (rental && listing.amenities.length > 0) {
          // Get amenity IDs
          const { data: amenityData } = await supabase.from('amenities').select('id, name');

          if (amenityData) {
            const amenityMap = new Map(amenityData.map((a) => [a.name, a.id]));

            const amenityInserts = listing.amenities
              .filter((name) => amenityMap.has(name))
              .map((name) => ({
                rental_id: rental.id,
                amenity_id: amenityMap.get(name)!,
              }));

            if (amenityInserts.length > 0) {
              const { error: amenityError } = await supabase
                .from('rental_amenities')
                .insert(amenityInserts);

              if (amenityError) throw amenityError;
            }
          }
        }

        // Insert scrape metadata
        if (rental) {
          const { error: metadataError } = await supabase.from('scrape_metadata').insert({
            rental_id: rental.id,
            source_url: listing.listing_url,
            source_type: 'yad2',
            source_id: listing.yad2_id,
            source_name: 'Yad2',
          });

          if (metadataError) throw metadataError;
        }
      }

      console.log(`Successfully saved listing: ${listing.title}`);
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
    maxListings: number = 10
  ): Promise<{
    success: boolean;
    listings: number;
    message: string;
    errors?: string[];
  }> {
    try {
      const listings = await this.scrapeYad2(url, maxListings);
      let savedCount = 0;
      const errors: string[] = [];

      for (const listing of listings) {
        try {
          // Validate price before saving
          if (listing.price > 99999999) {
            console.warn(`Price too large for listing ${listing.title}: ${listing.price}`);
            listing.price = 0; // Set to 0 to indicate price needs review
          }
          
          await this.saveListing(listing);
          savedCount++;
        } catch (error) {
          const errorMsg = `Failed to save "${listing.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      return {
        success: savedCount > 0,
        listings: savedCount,
        message: `Successfully scraped ${savedCount} out of ${listings.length} listings from Yad2`,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        listings: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
