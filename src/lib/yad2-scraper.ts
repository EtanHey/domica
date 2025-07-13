import { createClient } from '@supabase/supabase-js';
import { DuplicateDetectionService } from './duplicate-detection';
import { PropertyInput } from './duplicate-detection/types';
import { utapi } from '@/server/uploadthing';
import { Yad2ScraperFirecrawl as PlaywrightYad2Scraper } from './scrapers/yad2-scraper-firecrawl';
import type { ScrapedListing } from './scrapers/base-scraper';

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
  private scraper: PlaywrightYad2Scraper;
  private initialized = false;

  constructor() {
    this.scraper = new PlaywrightYad2Scraper();
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.scraper.initialize();
      this.initialized = true;
    }
  }

  async cleanup() {
    if (this.initialized) {
      await this.scraper.close();
      this.initialized = false;
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
   * Check if URL is a single listing or search results
   */
  private isListingUrl(url: string): boolean {
    return url.includes('/realestate/item/') || url.includes('/item/');
  }

  /**
   * Convert scraped listing to Yad2Listing format
   */
  private convertToYad2Listing(scraped: ScrapedListing): Yad2Listing {
    return {
      yad2_id: scraped.id,
      title: scraped.title,
      price: scraped.price,
      currency: '₪',
      location: scraped.city || scraped.location,
      rooms: scraped.rooms,
      floor: scraped.floor,
      size_sqm: scraped.size_sqm,
      description: scraped.description,
      property_type: scraped.property_type,
      image_urls: scraped.image_urls,
      amenities: scraped.amenities,
      contact_name: scraped.contact_name,
      phone_number: scraped.phone_number,
      listing_url: scraped.listing_url,
      listing_type: scraped.listing_type,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Step 1: Extract listing URLs from search pages
   */
  async extractListingUrls(url: string, maxListings: number = 10): Promise<string[]> {
    try {
      console.log(`🔍 Extracting listing URLs from: ${url}`);
      await this.ensureInitialized();

      const urls = await this.scraper.extractListingUrls(url, maxListings);
      return urls;
    } catch (error) {
      console.error('Error extracting listing URLs:', error);
      return [];
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Step 2: Scrape individual listing (optimized for single calls)
   */
  async scrapeSingleListing(url: string): Promise<Yad2Listing | null> {
    try {
      console.log('🏠 Scraping single Yad2 listing:', url);
      await this.ensureInitialized();

      const listing = await this.scraper.scrapeSingleListing(url);
      if (!listing) {
        return null;
      }

      return this.convertToYad2Listing(listing);
    } catch (error) {
      console.error('Error scraping single listing:', error);
      return null;
    } finally {
      // Note: Don't cleanup here if we're doing batch operations
      // The caller should manage cleanup for batch operations
    }
  }

  /**
   * Step 2 Batch: Scrape multiple listings efficiently
   */
  async scrapeMultipleListings(urls: string[]): Promise<Yad2Listing[]> {
    try {
      console.log(`🏘️ Batch scraping ${urls.length} listings`);
      await this.ensureInitialized();

      const scrapedListings = await this.scraper.scrapeListings(urls);
      const yad2Listings = scrapedListings
        .map(listing => this.convertToYad2Listing(listing))
        .filter((listing): listing is Yad2Listing => listing !== null);

      return yad2Listings;
    } catch (error) {
      console.error('Error in batch scraping:', error);
      return [];
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Scrape Yad2 search results page using two-step approach
   */
  async scrapeSearchResults(url: string, maxListings: number = 10): Promise<Yad2Listing[]> {
    try {
      console.log('🚀 Scraping Yad2 URL with two-step approach:', url);
      await this.ensureInitialized();

<<<<<<< HEAD
      const scrapedListings = await this.scraper.scrapeSearchResults(url, maxListings);
      console.log(`Found ${scrapedListings.length} listings`);

      return scrapedListings.map((listing) => this.convertToYad2Listing(listing));
=======
      // Use the enhanced two-step method if available
      if (typeof this.scraper.scrapeSearchResultsWithTwoStep === 'function') {
        console.log('Using enhanced two-step scraping...');
        const scrapedListings = await this.scraper.scrapeSearchResultsWithTwoStep(url, maxListings);
        console.log(`Found ${scrapedListings.length} listings via two-step approach`);
        return scrapedListings.map(listing => this.convertToYad2Listing(listing));
      } else {
        // Fallback to original method
        console.log('Using legacy scraping method...');
        const scrapedListings = await this.scraper.scrapeSearchResults(url, maxListings);
        console.log(`Found ${scrapedListings.length} listings`);
        return scrapedListings.map(listing => this.convertToYad2Listing(listing));
      }
>>>>>>> 50984b7 (Working version finally)
    } catch (error) {
      console.error('Error scraping Yad2:', error);
      throw error;
    } finally {
      // Cleanup after search results scrape
      await this.cleanup();
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
                console.warn(
                  `Failed to upload image ${index + 1}: ${errorMessage}. Using original URL as fallback.`
                );
                return null;
              } catch (uploadError) {
                console.warn(
                  `Error uploading image ${index + 1}:`,
                  uploadError,
                  'Using original URL as fallback.'
                );
                return null;
              }
            });

            const uploadResults = await Promise.all(uploadPromises);
            const successfulUploads = uploadResults.filter((result) => result !== null);

            if (successfulUploads.length > 0) {
              const { error: imageError } = await supabase
                .from('property_images')
                .insert(successfulUploads);

              if (imageError) {
                console.error('Error saving image references:', imageError);
              } else {
                console.log(`✅ Saved ${successfulUploads.length} images to database`);
              }
            }
          } catch (error) {
            console.error('Error in image upload process:', error);
          }
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
          if (listing.price === 0) {
            console.warn(`No price found for listing ${listing.title}, skipping...`);
            errors.push(`No price found for listing: ${listing.title}`);
            continue; // Skip listings without prices
          }

          if (listing.price > 99999999) {
            console.warn(`Price too large for listing ${listing.title}: ${listing.price}`);
            errors.push(`Price too large for listing: ${listing.title} (${listing.price})`);
            continue; // Skip listings with invalid prices
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
