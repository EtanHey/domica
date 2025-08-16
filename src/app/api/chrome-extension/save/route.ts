import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DuplicateDetectionService } from '@/lib/duplicate-detection';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper functions for fallback extraction
function extractRoomsFromText(text: string): number | null {
  const patterns = [/(\d+)\s*חדרים/, /(\d+\.\d+)\s*חדרים/, /(\d+)\s*חד/, /דירת\s*(\d+)/];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

function extractCityFromText(text: string): string | null {
  const cities = [
    'רחובות',
    'תל אביב',
    'ירושלים',
    'חיפה',
    'ראשון לציון',
    'פתח תקווה',
    'אשדוד',
    'נתניה',
    'באר שבע',
    'בני ברק',
    'חולון',
    'רמת גן',
    'אשקלון',
    'רעננה',
    'בת ים',
    'כפר סבא',
    'הרצליה',
    'מודיעין',
    'נס ציונה',
    'רמלה',
  ];

  for (const city of cities) {
    if (text.includes(city)) {
      return city;
    }
  }
  return null;
}

function extractNeighborhoodFromText(text: string): string | null {
  // Rehovot neighborhoods
  const neighborhoods = [
    'מרמורק',
    'רחובות ההולנדית',
    'אושיות',
    'שעריים',
    'קרית משה',
    'נווה יהודה',
    'רמת אלון',
    'גני הדר',
    'חבצלת',
    'שכונה ירוקה',
    'דניה',
    'כפר גבירול',
    'גורדון',
    'המדע',
    'ויצמן',
  ];

  for (const neighborhood of neighborhoods) {
    if (text.includes(neighborhood)) {
      return neighborhood;
    }
  }
  return null;
}

function extractStreetFromText(text: string): string | null {
  const streetPatterns = [/רחוב\s+([^\s,]+)/, /רח[׳']\s+([^\s,]+)/, /ב([^\s,]+)\s+\d+/];

  for (const pattern of streetPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractFloorFromText(text: string): number | null {
  const patterns = [/קומה\s+(\d+)/, /קומה\s+([א-י])/];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Convert Hebrew letters to numbers if needed
      if (match[1].match(/[א-י]/)) {
        const hebrewToNum: any = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9, י: 10 };
        return hebrewToNum[match[1]] || null;
      }
      return parseInt(match[1]);
    }
  }
  return null;
}

function extractSizeFromText(text: string): number | null {
  const patterns = [/(\d+)\s*מ[״"'ר]/, /(\d+)\s*מטר/];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
}

function extractPhoneFromText(text: string): string | null {
  const phonePatterns = [
    /05\d[-\s]?\d{7,8}/g, // Israeli mobile
    /0\d{1,2}[-\s]?\d{7,8}/g, // Israeli landline
    /\d{3}[-\s]?\d{3}[-\s]?\d{4}/g, // Alternative format
  ];

  for (const pattern of phonePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const phone = match[0].replace(/[-\s]/g, '');
      if (phone.length >= 9 && phone.length <= 10) {
        return phone;
      }
    }
  }
  return null;
}

// Create a clean description without redundant info
function createCleanDescription(text: string, extractedData: any): string {
  let cleanText = text;

  // Remove price mentions (they're shown separately)
  cleanText = cleanText.replace(/₪\s*\d+[,\d]*/g, '');
  cleanText = cleanText.replace(/\d+[,\d]*\s*₪/g, '');
  cleanText = cleanText.replace(/\d+[,\d]*\s*ש["״']ח/g, '');
  cleanText = cleanText.replace(/מחיר:?\s*\d+[,\d]*/g, '');

  // Remove phone numbers (shown in contact button)
  cleanText = cleanText.replace(/05\d[-\s]?\d{7,8}/g, '');
  cleanText = cleanText.replace(/0\d{1,2}[-\s]?\d{7,8}/g, '');

  // Remove redundant room/size info if already extracted
  if (extractedData.rooms) {
    cleanText = cleanText.replace(new RegExp(`${extractedData.rooms}\s*חדרים?`, 'g'), '');
    cleanText = cleanText.replace(new RegExp(`${extractedData.rooms}\s*חד'?`, 'g'), '');
  }

  if (extractedData.size) {
    cleanText = cleanText.replace(new RegExp(`${extractedData.size}\s*מ[״"'ר]`, 'g'), '');
    cleanText = cleanText.replace(new RegExp(`${extractedData.size}\s*מטר`, 'g'), '');
  }

  if (extractedData.floor) {
    cleanText = cleanText.replace(new RegExp(`קומה\s*${extractedData.floor}`, 'g'), '');
  }

  // Remove address if it's already extracted
  if (extractedData.street) {
    cleanText = cleanText.replace(new RegExp(extractedData.street + '\s*\d*', 'g'), '');
  }

  // Remove promotional phrases
  const promotionalPhrases = [
    'חדש להשכרה[!]*',
    'ללא תיווך[!]*',
    'בבלעדיות[!]*',
    'מיידי[!]*',
    'דחוף[!]*',
    'לפרטים.*',
    'להתקשר.*',
    'ווטסאפ.*',
    'whatsapp.*',
  ];

  promotionalPhrases.forEach((phrase) => {
    cleanText = cleanText.replace(new RegExp(phrase, 'gi'), '');
  });

  // Clean up multiple spaces, pipes, and line breaks
  cleanText = cleanText.replace(/\|/g, ' ');
  cleanText = cleanText.replace(/\s+/g, ' ');
  cleanText = cleanText.replace(/^[\s,]+|[\s,]+$/g, '');

  // Remove leading commas or dots
  cleanText = cleanText.replace(/^[,\.\s]+/, '');

  // Limit to 500 chars and ensure it ends nicely
  if (cleanText.length > 500) {
    cleanText = cleanText.substring(0, 497) + '...';
    // Try to end at a sentence or comma
    const lastPeriod = cleanText.lastIndexOf('.');
    const lastComma = cleanText.lastIndexOf(',');
    const cutPoint = Math.max(lastPeriod, lastComma);
    if (cutPoint > 300) {
      cleanText = cleanText.substring(0, cutPoint);
    }
  }

  // If we removed too much and have very little left, use a portion of original
  if (cleanText.length < 50 && text.length > 50) {
    // Get the middle portion of the text that likely has the description
    const sentences = text.split(/[.!]/);
    const descSentences = sentences.filter(
      (s) => s.length > 20 && !s.match(/₪|\d{4,}|05\d{8}/) && !s.includes('לפרטים')
    );
    cleanText = descSentences.slice(0, 3).join('. ');
    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 497) + '...';
    }
  }

  return cleanText.trim();
}

function extractDateFromText(text: string): string | null {
  const patterns = [/כניסה\s+ב?(\d{1,2}[./]\d{1,2})/, /מיידית/];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('מיידית')) {
        return 'מיידית';
      }
      return match[1];
    }
  }
  return null;
}

function extractAmenitiesFromText(text: string): string[] {
  const amenities = [];
  const amenityMap = {
    חניה: ['חניה', 'חנייה', 'חניות'],
    מעלית: ['מעלית'],
    מרפסת: ['מרפסת', 'מרפסות'],
    מיזוג: ['מיזוג', 'מזגן', 'מזגנים'],
    'ממ"ד': ['ממ"ד', 'ממד'],
    גינה: ['גינה'],
    מחסן: ['מחסן'],
  };

  for (const [amenity, keywords] of Object.entries(amenityMap)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        amenities.push(amenity);
        break;
      }
    }
  }

  return amenities;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Chrome extension save API called');
    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    const { posts, source, timestamp } = body;

    if (!posts || !Array.isArray(posts)) {
      console.error('Invalid posts data:', posts);
      return NextResponse.json({ error: 'Invalid posts data' }, { status: 400 });
    }

    console.log(`Processing ${posts.length} posts`);

    // Process posts in batches to respect Claude API rate limits (5 requests per minute)
    const BATCH_SIZE = 3; // Process 3 at a time to stay well under rate limit
    const BATCH_DELAY = 15000; // 15 seconds between batches to ensure we stay under 5 req/min

    const processBatch = async (batch: any[], startIndex: number) => {
      return Promise.all(
        batch.map(async (post: any, index: number) => {
          const actualIndex = startIndex + index;
          try {
            console.log(`Processing post ${actualIndex + 1}/${posts.length} with Claude API`);

            let extractedData;

            try {
              // Try Claude API first for better extraction
              const prompt = `
            Extract rental information from this Hebrew Facebook post.
            Create a clean, professional description without redundant information.
            Remove prices, phone numbers, and promotional phrases from the description.
            Focus on the property features and amenities.
            
            Post text: ${post.text}
            
            Return JSON with these fields:
            - price (number or null)
            - rooms (number or null) 
            - city (string)
            - neighborhood (string or null)
            - street (string or null)
            - floor (number or null)
            - size (square meters, number or null)
            - amenities (array of strings in Hebrew)
            - availableFrom (string or null)
            - description (clean professional description, max 500 chars)
          `;

              const response = await anthropic.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1000,
                temperature: 0,
                messages: [
                  {
                    role: 'user',
                    content: prompt,
                  },
                ],
              });

              const content = response.content[0];
              if (content.type === 'text') {
                // Try multiple regex patterns to find JSON
                const jsonPatterns = [
                  /```json\s*([\s\S]*?)\s*```/, // JSON in code blocks
                  /\{[\s\S]*\}/, // Raw JSON object
                ];

                let jsonText = null;
                for (const pattern of jsonPatterns) {
                  const match = content.text.match(pattern);
                  if (match) {
                    jsonText = match[1] || match[0];
                    break;
                  }
                }

                if (jsonText) {
                  try {
                    // Clean the JSON before parsing
                    let cleanedJson = jsonText
                      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
                      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
                      .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double
                      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                      .replace(/\n\s*\n/g, '\n') // Remove empty lines
                      .trim();

                    extractedData = JSON.parse(cleanedJson);
                    console.log(`Claude extracted data for post ${actualIndex + 1}`);
                  } catch (parseError) {
                    console.log(
                      `JSON parse error for post ${actualIndex + 1}, using fallback:`,
                      parseError
                    );
                    console.log(`Attempted to parse:`, jsonText.substring(0, 200));
                  }
                }
              }
            } catch (apiError) {
              console.log(
                `Claude API failed for post ${actualIndex + 1}, using fallback extraction:`,
                apiError
              );
            }

            // Fallback to local extraction if Claude fails or is unavailable
            if (!extractedData) {
              extractedData = {
                price: post.rawPrices?.[0] ? parseInt(post.rawPrices[0].replace(/,/g, '')) : null,
                rooms: extractRoomsFromText(post.text),
                city: extractCityFromText(post.text) || 'רחובות',
                neighborhood: extractNeighborhoodFromText(post.text),
                street: extractStreetFromText(post.text),
                floor: extractFloorFromText(post.text),
                size: extractSizeFromText(post.text),
                amenities: extractAmenitiesFromText(post.text),
                availableFrom: extractDateFromText(post.text),
                description: createCleanDescription(post.text, {}),
              };
            }

            // Always use extracted phone from scraper
            extractedData.contactPhone = post.phones?.[0] || extractPhoneFromText(post.text);

            // Create property object
            const property: any = {
              id: `ext-${Date.now()}-${actualIndex}`,
              title: extractedData.rooms
                ? `דירת ${extractedData.rooms} חדרים ב${extractedData.neighborhood || extractedData.city || 'לא צוין'}`
                : 'דירה להשכרה',
              pricePerMonth: (extractedData.price || 0).toString(),
              currency: '₪',
              locationText: `${extractedData.neighborhood || 'מרכז'}, ${extractedData.city || 'לא צוין'}`,
              bedrooms: extractedData.rooms || null,
              bathrooms: null,
              images: post.images?.map((url: string) => ({
                imageUrl: url,
                isPrimary: false,
              })) || [{ imageUrl: '/placeholder-rental.jpg', isPrimary: true }],
              duplicateStatus: null,
              duplicateScore: null,
              listingType: 'rent',
              description: extractedData.description || post.text.substring(0, 500),
              amenities: extractedData.amenities || [],
              contactPhone: extractedData.contactPhone || post.phones?.[0],
              floor: extractedData.floor || null,
              source: 'facebook',
              sourceUrl: post.postUrl || 'https://www.facebook.com',
              // Extension-specific fields
              authorName: post.author,
              postTime: post.postTime,
              extractedAt: timestamp,
            };

            return property;
          } catch (error) {
            console.error('Error processing individual post:', error);
            return null;
          }
        })
      );
    };

    // Process posts in batches
    const allResults = [];
    for (let i = 0; i < posts.length; i += BATCH_SIZE) {
      const batch = posts.slice(i, i + BATCH_SIZE);
      console.log(
        `Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(posts.length / BATCH_SIZE)} (posts ${i + 1}-${Math.min(i + BATCH_SIZE, posts.length)})`
      );

      const batchResults = await processBatch(batch, i);
      allResults.push(...batchResults);

      // Wait between batches to avoid rate limiting (except for last batch)
      if (i + BATCH_SIZE < posts.length) {
        console.log(
          `Waiting ${BATCH_DELAY / 1000} seconds before next batch to avoid rate limiting...`
        );
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    const results = allResults;
    const processedPosts = results.filter((p) => p !== null);

    // Save to database
    const savedProperties = [];
    const updatedProperties = [];
    const skippedDuplicates = [];
    const errors = [];

    for (const property of processedPosts) {
      try {
        // Check for duplicates before inserting
        const duplicateService = new DuplicateDetectionService(supabase as any, {
          enableAIComparison: false, // Skip AI for speed in extension
        });
        
        let duplicateResult;
        try {
          duplicateResult = await duplicateService.checkForDuplicate({
            sourceUrl: property.sourceUrl,
            sourceId: property.id,
            sourcePlatform: 'facebook',
            title: property.title,
            description: property.description,
            price: parseFloat(property.pricePerMonth) || 0,
            bedrooms: property.bedrooms,
            locationText: property.locationText,
          } as any);
        } catch (dupError) {
          console.log('Duplicate check failed, proceeding with insert:', dupError);
          // If duplicate check fails, proceed with normal insert
          duplicateResult = { isDuplicate: false };
        }

        if (duplicateResult.isDuplicate && duplicateResult.matchedProperty) {
          // Update existing property's last_seen_at
          const { data: updatedProperty, error: updateError } = await supabase
            .from('properties')
            .update({
              last_seen_at: new Date().toISOString(),
              price_per_month: parseFloat(property.pricePerMonth) || 0,
              description: property.description || '',
            })
            .eq('id', duplicateResult.matchedProperty.id)
            .select()
            .single();

          if (!updateError && updatedProperty) {
            console.log(`Updated existing property: ${updatedProperty.id}`);
            updatedProperties.push(updatedProperty);
            continue; // Skip to next property
          } else if (updateError) {
            console.error('Failed to update duplicate property:', updateError);
            skippedDuplicates.push({
              title: property.title,
              reason: 'Update failed'
            });
            continue;
          }
        }

        // Prepare property data for database (using snake_case for Supabase)
        const propertyData: any = {
          title: property.title,
          price_per_month: parseFloat(property.pricePerMonth) || 0,
          currency: 'ILS',
          bedrooms: property.bedrooms ? Math.floor(property.bedrooms) : null,
          bathrooms: property.bathrooms ? property.bathrooms.toString() : null,
          property_type: 'דירה',
          available_date: new Date().toISOString().split('T')[0],
          is_active: true,
          listing_type: 'rent',
          source_platform: 'facebook',
          source_url: property.sourceUrl,
          description: property.description || '',
          phone_normalized: property.contactPhone?.replace(/\D/g, '') || null,
          square_meters: property.size || null,
        };

        // Insert property
        const { data: newProperty, error: propertyError } = await supabase
          .from('properties')
          .insert(propertyData)
          .select()
          .single();

        if (propertyError) {
          throw propertyError;
        }

        // Insert location
        if (property.locationText && newProperty) {
          const [neighborhood, city] = property.locationText
            .split(',')
            .map((s: string) => s.trim());

          const locationData: any = {
            property_id: newProperty.id,
            city: city || 'מודיעין',
            neighborhood: neighborhood || 'מרכז',
            address: property.street || property.locationText,
          };

          const { error: locationError } = await supabase
            .from('property_location')
            .insert(locationData);

          if (locationError) {
            console.error('Location insert error:', locationError);
          }
        }

        // Insert images
        if (property.images && property.images.length > 0 && newProperty) {
          const imageData = property.images.map((img: any, index: number) => ({
            property_id: newProperty.id,
            image_url: img.imageUrl,
            image_order: index,
            is_primary: img.isPrimary || index === 0,
          }));

          const { error: imageError } = await supabase.from('property_images').insert(imageData);

          if (imageError) {
            console.error('Image insert error:', imageError);
          }
        }

        // Handle amenities
        if (property.amenities && property.amenities.length > 0 && newProperty) {
          const amenityData: any = {
            property_id: newProperty.id,
            parking: 0,
            elevator: false,
            balcony: 0,
            garden: 0,
            air_conditioning: false,
            storage: false,
            safe_room: false,
          };

          // Map Hebrew amenities to database columns
          property.amenities.forEach((amenityName: string) => {
            switch (amenityName) {
              case 'חניה':
                amenityData.parking = 1;
                break;
              case 'מעלית':
                amenityData.elevator = true;
                break;
              case 'מרפסת':
                amenityData.balcony = 1;
                break;
              case 'גינה':
                amenityData.garden = 1;
                break;
              case 'מזגן':
              case 'מיזוג':
                amenityData.air_conditioning = true;
                break;
              case 'מחסן':
                amenityData.storage = true;
                break;
              case 'ממ״ד':
              case 'ממד':
                amenityData.safe_room = true;
                break;
            }
          });

          const { error: amenityError } = await supabase
            .from('property_amenities')
            .insert(amenityData);

          if (amenityError) {
            console.error('Amenity insert error:', amenityError);
          }
        }

        savedProperties.push(newProperty);
      } catch (error: any) {
        console.error('Error saving property:', error);
        console.error('Property data that failed:', JSON.stringify(property, null, 2));
        errors.push({
          property: property.title,
          error: error.message || 'Unknown error',
          details: error.toString()
        });
      }
    }

    // Always return success even if some properties failed
    const totalProcessed = savedProperties.length + updatedProperties.length;
    const response = {
      success: totalProcessed > 0 || errors.length === 0,
      saved: savedProperties.length,
      updated: updatedProperties.length,
      skipped: skippedDuplicates.length,
      total: posts.length,
      properties: [...savedProperties, ...updatedProperties],
      errors: errors.length > 0 ? errors : undefined,
      skippedDuplicates: skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
      message:
        totalProcessed > 0
          ? `נשמרו ${savedProperties.length} דירות חדשות${updatedProperties.length > 0 ? ` ועודכנו ${updatedProperties.length} קיימות` : ''}`
          : errors.length > 0
            ? 'לא הצלחנו לעבד את הפוסטים'
            : 'לא נמצאו דירות חדשות לשמירה',
    };

    console.log('API Response:', {
      saved: response.saved,
      updated: response.updated,
      skipped: response.skipped,
      total: response.total,
      hasErrors: errors.length > 0,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Extension API error:', error);
    console.error('Error stack:', error.stack);

    // Return a more detailed error response
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error.message,
        saved: 0,
        total: 0,
      },
      { status: 500 }
    );
  }
}

// CORS headers for extension
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
