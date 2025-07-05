import { createClient } from '@supabase/supabase-js';
import { DuplicateDetectionService } from './duplicate-detection';
import { RentalInput } from './duplicate-detection/types';

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

      // Extract listing type from URL
      const listingType = url.includes('/realestate/forsale') ? 'sale' : 'rent';

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
   * Scrape Yad2 search results page
   */
  async scrapeYad2(url: string, maxListings: number = 10): Promise<Yad2Listing[]> {
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
      const listingBlocks = this.extractListingBlocks(markdown, html);

      for (const block of listingBlocks.slice(0, maxListings)) {
        const listing = this.parseListingBlock(block, url, listingType);
        if (listing) {
          listings.push(listing);
        }
      }

      // If no individual listings found, try alternative parsing
      if (listings.length === 0) {
        console.log('No individual listings found with standard parsing, trying alternative method...');
        
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

    // Skip if this looks like a search results page without listings
    if (markdown.includes('נדל"ן למכירה') && markdown.includes('אלפי מודעות')) {
      console.log('This appears to be a search page header, not individual listings');
      return [];
    }

    // Try to find feed items in HTML first (more reliable)
    if (html) {
      // Look for Yad2 feed item patterns - use a more specific pattern
      // Match feed items that contain data attributes
      const feedItemPattern = /<div[^>]*data-feed-item[^>]*>[\s\S]*?(?=<div[^>]*data-feed-item|$)/gi;
      let matches = html.match(feedItemPattern);
      
      // If no data-feed-item, try class-based pattern with better boundary detection
      if (!matches || matches.length === 0) {
        // Look for feed items with specific Yad2 classes
        const classPattern = /<div[^>]*class="[^"]*feed[^"]*item[^"]*"[^>]*>(?:[^<]|<(?!\/div>))*(?:<div[^>]*>(?:[^<]|<(?!\/div>))*<\/div>)*[^<]*<\/div>/gi;
        matches = html.match(classPattern);
      }
      
      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} potential feed items in HTML`);
        // Convert HTML to text for each match
        const textBlocks = matches.map(htmlBlock => {
          // Extract text content more carefully
          let text = htmlBlock;
          
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
          
          return reconstructed
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\\+/g, '') // Remove backslashes
            .replace(/\*+/g, '') // Remove asterisks
            .replace(/\[|\]/g, '') // Remove brackets
            .trim();
        }).filter(text => text.length > 50 && text.match(/₪|חדרים/)); // Must have price or rooms
        
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

      // Generate a title from the content WITHOUT price
      const title = `${rooms || '?'} חדרים ב${location}`;

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
      const rentalInput: RentalInput = {
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
      const duplicateResult = await duplicateDetector.checkForDuplicate(rentalInput);

      if (duplicateResult.isDuplicate && duplicateResult.action === 'merge') {
        console.log(`Duplicate found for "${listing.title}", merging with existing listing...`);
        await duplicateDetector.mergeRentals(duplicateResult.matchedRental!.id, rentalInput);
        return 'duplicate';
      }

      if (duplicateResult.action === 'update') {
        console.log(`Exact match found for "${listing.title}", updating...`);
        // Update existing listing with same source
        const { error: updateError } = await supabase
          .from('rentals')
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
          .eq('facebook_id', listing.yad2_id);

        if (updateError) throw updateError;
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
            listing_type: listing.listing_type,
            duplicate_status: duplicateResult.action === 'review' ? 'review' : 'unique',
            source_platform: 'yad2',
            source_id: listing.yad2_id,
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
    maxListings: number = 10
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
          const errorMsg = `Failed to save "${listing.title}": ${error instanceof Error ? error.message : 'Unknown error'}`;
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
