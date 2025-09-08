import { NextRequest, NextResponse } from 'next/server';
import { progressTracker } from '@/lib/progress-tracker';

interface MadlanListing {
  id: string;
  title: string;
  price: number;
  address: string;
  city: string;
  neighborhood: string;
  rooms: number;
  area: number;
  floor: number;
  totalFloors: number;
  propertyType: string;
  description: string;
  images: string[];
  amenities: string[];
  entryDate: string;
  publishDate: string;
  contactName: string;
  contactPhone: string;
  isPromoted: boolean;
  sourceUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { url, sessionId } = await request.json();

    if (!url || !url.includes('madlan.co.il')) {
      return NextResponse.json(
        { error: 'כתובת URL לא תקינה' },
        { status: 400 }
      );
    }

    // Primary approach: Use Firecrawl API directly
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    
    if (firecrawlApiKey) {
      try {
        // Initialize progress tracking
        if (sessionId) {
          progressTracker.updateProgress(sessionId, {
            stage: 'urls',
            message: 'מחפש קישורי נכסים...',
            percentage: 5
          });
        }
        
        console.log('Step 1: Getting property URLs from list page:', url);
        
        // First, get the list of property URLs
        const listResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlApiKey}`,
          },
          body: JSON.stringify({
            url: url,
            formats: ['extract'],
            onlyMainContent: false,
            waitFor: 3000,
            extract: {
              prompt: 'Extract all property listing URLs from this Madlan search results page. Look for links to individual property pages.',
              schema: {
                type: 'object',
                properties: {
                  propertyUrls: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', description: 'Full URL to the property detail page' },
                        title: { type: 'string', description: 'Property title or address' },
                        price: { type: 'string', description: 'Monthly rental price in shekels' },
                      }
                    }
                  }
                }
              }
            }
          }),
        });

        if (!listResponse.ok) {
          throw new Error('Failed to fetch property list');
        }

        const listData = await listResponse.json();
        const foundUrls = listData.data?.extract?.propertyUrls?.length || 0;
        console.log('Found property URLs:', foundUrls);

        if (!listData.success || !listData.data?.extract?.propertyUrls) {
          if (sessionId) {
            progressTracker.updateProgress(sessionId, {
              stage: 'error',
              message: 'לא נמצאו קישורי נכסים',
              error: 'No property URLs found'
            });
          }
          throw new Error('No property URLs found');
        }

        const propertyUrls = listData.data.extract.propertyUrls;
        const listings: MadlanListing[] = [];
        let completedCount = 0;
        
        // Step 2: Scrape each individual property page in parallel
        console.log('Step 2: Scraping individual property pages in parallel...');
        
        const BATCH_SIZE = parseInt(process.env.MADLAN_BATCH_SIZE || '5'); // Process N properties at a time
        const MAX_PROPERTIES = process.env.NODE_ENV === 'production' 
          ? parseInt(process.env.MADLAN_MAX_PROPERTIES || '50') // Production: default 50, configurable
          : parseInt(process.env.MADLAN_MAX_PROPERTIES || '10'); // Development: default 10
        
        // Update progress with found URLs
        if (sessionId) {
          progressTracker.updateProgress(sessionId, {
            stage: 'urls',
            message: `נמצאו ${foundUrls} נכסים, מתחיל גירוד...`,
            total: Math.min(propertyUrls.length, MAX_PROPERTIES),
            completed: 0,
            percentage: 15
          });
        }
        
        console.log(`Configuration: Batch size=${BATCH_SIZE}, Max properties=${MAX_PROPERTIES}, Environment=${process.env.NODE_ENV || 'development'}`);
        const propertiesToScrape = propertyUrls.slice(0, Math.min(propertyUrls.length, MAX_PROPERTIES));
        
        // Process in batches
        for (let batchStart = 0; batchStart < propertiesToScrape.length; batchStart += BATCH_SIZE) {
          const batch = propertiesToScrape.slice(batchStart, Math.min(batchStart + BATCH_SIZE, propertiesToScrape.length));
          const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(propertiesToScrape.length / BATCH_SIZE);
          
          console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} properties)`);
          
          // Update progress for batch start
          if (sessionId) {
            progressTracker.updateProgress(sessionId, {
              stage: 'scraping',
              message: `מעבד חבילה ${batchNum}/${totalBatches} (${batch.length} נכסים)`,
              current: batchStart + 1,
              total: propertiesToScrape.length,
              completed: completedCount,
              percentage: progressTracker.calculatePercentage('scraping', batchStart, propertiesToScrape.length)
            });
          }
          
          const batchPromises = batch.map(async (propUrlData: { url: string; title?: string; price?: string }, batchIndex: number) => {
            const globalIndex = batchStart + batchIndex;
            const propUrl = propUrlData.url;
            
            // Ensure URL is absolute
            const fullUrl = propUrl.startsWith('http') 
              ? propUrl 
              : `https://www.madlan.co.il${propUrl}`;
              
            console.log(`Scraping property ${globalIndex + 1}/${propertiesToScrape.length}: ${fullUrl}`);
            
            try {
              const propResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${firecrawlApiKey}`,
                },
                body: JSON.stringify({
                  url: fullUrl,
                  formats: ['extract'],
                  onlyMainContent: false,
                  waitFor: 2000,
                  extract: {
                    prompt: 'Extract detailed property information from this Madlan property page. Get the actual contact person name (like יורי, מאור) from the contact section, NOT company names. Extract all amenities that are listed as available. Get all images from the gallery.',
                    schema: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Property title or full address' },
                        price: { type: 'string', description: 'Monthly rental price in shekels' },
                        address: { type: 'string', description: 'Street address' },
                        city: { type: 'string', description: 'City name' },
                        neighborhood: { type: 'string', description: 'Neighborhood or area name' },
                        rooms: { type: 'string', description: 'Number of rooms (e.g. "3.5 חד׳")' },
                        area: { type: 'string', description: 'Area in square meters (e.g. "90 מ״ר")' },
                        floor: { type: 'string', description: 'Floor information (e.g. "קומה 2", "קומת קרקע", "מרתף")' },
                        propertyType: { type: 'string', description: 'Type of property (דירה, בית פרטי, etc.)' },
                        description: { type: 'string', description: 'Full property description text' },
                        images: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'ALL image URLs from the property gallery - main image, all gallery images, thumbnails'
                        },
                        amenities: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'List of amenities that are available in the property: חניה, מעלית, מרפסת, מיזוג אוויר, ממ״ד, מחסן, etc.'
                        },
                        parking: { type: 'boolean', description: 'Has parking' },
                        elevator: { type: 'boolean', description: 'Has elevator' },
                        balcony: { type: 'boolean', description: 'Has balcony' },
                        airCondition: { type: 'boolean', description: 'Has air conditioning' },
                        safeRoom: { type: 'boolean', description: 'Has safe room (ממ״ד)' },
                        storage: { type: 'boolean', description: 'Has storage' },
                        renovated: { type: 'boolean', description: 'Is renovated' },
                        accessible: { type: 'boolean', description: 'Wheelchair accessible' },
                        furnished: { type: 'string', description: 'Furniture status: ללא ריהוט, ריהוט חלקי, ריהוט מלא' },
                        contactName: { type: 'string', description: 'ACTUAL contact person name from יצירת קשר section (e.g., יורי, מאור, רונית) - NOT company names' },
                        contactPhone: { type: 'string', description: 'Contact phone number' },
                        entryDate: { type: 'string', description: 'Entry date or availability' },
                        publishDate: { type: 'string', description: 'Publication date' }
                      }
                    }
                  }
                }),
              });

              if (propResponse.ok) {
                const propData = await propResponse.json();
                
                if (propData.success && propData.data?.extract) {
                  const prop = propData.data.extract;
                  
                  // Parse floor information
                  const floorStr = prop.floor?.toString() || '';
                  let floor = 0;
                  let totalFloors = 0;
                  
                  if (floorStr.includes('קומה')) {
                    const floorMatch = floorStr.match(/קומה\s*(\d+)/);
                    if (floorMatch) {
                      floor = parseInt(floorMatch[1]);
                    }
                  } else if (floorStr.includes('מרתף')) {
                    floor = -1;
                  } else if (floorStr.includes('קומת קרקע')) {
                    floor = 0;
                  } else if (floorStr.match(/^\d+$/)) {
                    floor = parseInt(floorStr);
                  }

                  // Build amenities array from extracted data
                  const extractedAmenities: string[] = [];
                  
                  // Add amenities from the amenities array
                  if (Array.isArray(prop.amenities)) {
                    extractedAmenities.push(...prop.amenities);
                  }
                  
                  // Add amenities based on boolean fields  
                  if (prop.parking) extractedAmenities.push('חניה');
                  if (prop.elevator) extractedAmenities.push('מעלית');
                  if (prop.balcony) extractedAmenities.push('מרפסת');
                  if (prop.airCondition) extractedAmenities.push('מיזוג אוויר');
                  if (prop.renovated) extractedAmenities.push('משופצת');
                  if (prop.accessible) extractedAmenities.push('גישה לנכים');
                  if (prop.safeRoom) extractedAmenities.push('ממ״ד');
                  if (prop.storage) extractedAmenities.push('מחסן');
                  
                  // Add furniture status if present
                  if (prop.furnished && prop.furnished !== 'ללא ריהוט') {
                    extractedAmenities.push(prop.furnished);
                  }
                  
                  // Remove duplicates
                  const uniqueAmenities = [...new Set(extractedAmenities)];

                  const listing: MadlanListing = {
                    id: `madlan_${Date.now()}_${globalIndex}`,
                    title: prop.title || propUrlData.title || 'דירה להשכרה',
                    price: parseInt(prop.price?.toString().replace(/[^\d]/g, '') || propUrlData.price?.replace(/[^\d]/g, '') || '0'),
                    address: prop.address || '',
                    city: prop.city || '',
                    neighborhood: prop.neighborhood || '',
                    rooms: parseFloat(prop.rooms?.toString().replace(/[^\d.]/g, '') || '0'),
                    area: parseInt(prop.area?.toString().replace(/[^\d]/g, '') || '0'),
                    floor: floor,
                    totalFloors: totalFloors,
                    propertyType: prop.propertyType || 'דירה',
                    description: prop.description || '',
                    images: Array.isArray(prop.images) ? prop.images : [],
                    amenities: uniqueAmenities,
                    entryDate: prop.entryDate || new Date().toISOString().split('T')[0],
                    publishDate: prop.publishDate || new Date().toISOString().split('T')[0],
                    contactName: prop.contactName || '',
                    contactPhone: prop.contactPhone || '',
                    isPromoted: false,
                    sourceUrl: fullUrl
                  };
                  
                  console.log(`✓ Scraped: ${listing.title} - Contact: ${listing.contactName}`);
                  
                  return listing;
                }
              }
              return null;
            } catch (propError) {
              console.error(`Failed to scrape property ${globalIndex + 1}:`, propError);
              return null;
            }
          });
          
          // Wait for batch to complete and add to listings
          const batchResults = await Promise.all(batchPromises);
          const validListings = batchResults.filter((listing): listing is MadlanListing => listing !== null);
          listings.push(...validListings);
          completedCount += validListings.length;
          
          // Update progress after batch completion
          if (sessionId) {
            progressTracker.updateProgress(sessionId, {
              stage: 'scraping',
              message: `הושלמה חבילה ${batchNum}/${totalBatches} - נמצאו ${validListings.length} נכסים`,
              current: batchStart + batch.length,
              total: propertiesToScrape.length,
              completed: completedCount,
              percentage: progressTracker.calculatePercentage('scraping', batchStart + batch.length, propertiesToScrape.length)
            });
          }
          
          // Small delay between batches to avoid rate limits
          if (batchStart + BATCH_SIZE < propertiesToScrape.length) {
            const delayMs = parseInt(process.env.MADLAN_BATCH_DELAY || '1000');
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

        console.log(`Successfully scraped ${listings.length} properties`);
        
        // Update final progress
        if (sessionId) {
          progressTracker.updateProgress(sessionId, {
            stage: 'complete',
            message: `גירוד הושלם! נמצאו ${listings.length} נכסים`,
            percentage: 100
          });
        }
        
        if (listings.length > 0) {
          return NextResponse.json({ listings, sessionId });
        } else {
          if (sessionId) {
            progressTracker.updateProgress(sessionId, {
              stage: 'error',
              message: 'לא נמצאו נכסים',
              error: 'No properties found'
            });
          }
          throw new Error('לא הצלחנו לגרד נתונים מהנכסים');
        }
        
      } catch (firecrawlError) {
        console.error('Firecrawl failed:', firecrawlError);
        
        // Update progress with error
        if (sessionId) {
          progressTracker.updateProgress(sessionId, {
            stage: 'error',
            message: 'שגיאה בגירוד הנתונים',
            error: firecrawlError instanceof Error ? firecrawlError.message : 'Unknown error'
          });
        }
        
        return NextResponse.json({ 
          error: 'לא ניתן לגרד נתונים מהעמוד כרגע. אנא נסו שנית מאוחר יותר.',
          listings: []
        });
      }
    }

    // If no API key, return error
    return NextResponse.json({ 
      error: 'חסר API key לגירוד נתונים',
      listings: []
    });

  } catch (error) {
    console.error('Madlan scraping error:', error);
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת' },
      { status: 500 }
    );
  }
}