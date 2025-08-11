import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyLocationInsert = Database['public']['Tables']['property_location']['Insert'];
type PropertyImageInsert = Database['public']['Tables']['property_images']['Insert'];
type PropertyAmenitiesInsert = Database['public']['Tables']['property_amenities']['Insert'];

// Helper functions for fallback extraction
function extractRoomsFromText(text: string): number | null {
  const patterns = [
    /(\d+)\s*חדרים/,
    /(\d+\.\d+)\s*חדרים/,
    /(\d+)\s*חד/,
    /דירת\s*(\d+)/
  ];
  
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
    'רחובות', 'תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'פתח תקווה',
    'אשדוד', 'נתניה', 'באר שבע', 'בני ברק', 'חולון', 'רמת גן', 'אשקלון',
    'רעננה', 'בת ים', 'כפר סבא', 'הרצליה', 'מודיעין', 'נס ציונה', 'רמלה'
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
    'מרמורק', 'רחובות ההולנדית', 'אושיות', 'שעריים', 'קרית משה',
    'נווה יהודה', 'רמת אלון', 'גני הדר', 'חבצלת', 'שכונה ירוקה',
    'דניה', 'כפר גבירול', 'גורדון', 'המדע', 'ויצמן'
  ];
  
  for (const neighborhood of neighborhoods) {
    if (text.includes(neighborhood)) {
      return neighborhood;
    }
  }
  return null;
}

function extractStreetFromText(text: string): string | null {
  const streetPatterns = [
    /רחוב\s+([^\s,]+)/,
    /רח[׳']\s+([^\s,]+)/,
    /ב([^\s,]+)\s+\d+/
  ];
  
  for (const pattern of streetPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractFloorFromText(text: string): number | null {
  const patterns = [
    /קומה\s+(\d+)/,
    /קומה\s+([א-י])/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Convert Hebrew letters to numbers if needed
      if (match[1].match(/[א-י]/)) {
        const hebrewToNum: any = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10};
        return hebrewToNum[match[1]] || null;
      }
      return parseInt(match[1]);
    }
  }
  return null;
}

function extractSizeFromText(text: string): number | null {
  const patterns = [
    /(\d+)\s*מ[״"'ר]/,
    /(\d+)\s*מטר/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return null;
}

function extractPhoneFromText(text: string): string | null {
  const phonePattern = /0\d{1,2}[-\s]?\d{7,8}/;
  const match = text.match(phonePattern);
  return match ? match[0] : null;
}

function extractDateFromText(text: string): string | null {
  const patterns = [
    /כניסה\s+ב?(\d{1,2}[./]\d{1,2})/,
    /מיידית/
  ];
  
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
    'חניה': ['חניה', 'חנייה', 'חניות'],
    'מעלית': ['מעלית'],
    'מרפסת': ['מרפסת', 'מרפסות'],
    'מיזוג': ['מיזוג', 'מזגן', 'מזגנים'],
    'ממ"ד': ['ממ"ד', 'ממד'],
    'גינה': ['גינה'],
    'מחסן': ['מחסן']
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
    const { posts, source, timestamp } = await request.json();

    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json({ error: 'Invalid posts data' }, { status: 400 });
    }

    // Process each post with fallback extraction (skip Claude API to avoid rate limits)
    const processPromises = posts.map(async (post: any, index: number) => {
      try {
        // Skip Claude API and use direct extraction to avoid rate limits
        console.log(`Processing post ${index + 1}/${posts.length} with direct extraction`);
        
        // Extract data directly from the post
        const extractedData = {
          price: post.rawPrices?.[0] ? parseInt(post.rawPrices[0].replace(/,/g, '')) : null,
          rooms: extractRoomsFromText(post.text),
          city: extractCityFromText(post.text) || 'רחובות',
          neighborhood: extractNeighborhoodFromText(post.text),
          street: extractStreetFromText(post.text),
          floor: extractFloorFromText(post.text),
          size: extractSizeFromText(post.text),
          amenities: extractAmenitiesFromText(post.text),
          contactPhone: post.phones?.[0] || extractPhoneFromText(post.text),
          availableFrom: extractDateFromText(post.text),
          description: post.text.substring(0, 500)
        };

        // Create property object
        const property: any = {
          id: `ext-${Date.now()}-${index}`,
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
            isPrimary: false
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
    });
    
    // Process all posts in parallel
    const results = await Promise.all(processPromises);
    const processedPosts = results.filter(p => p !== null);

    // Save to database
    const savedProperties = [];
    const errors = [];

    for (const property of processedPosts) {
      try {
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
          const [neighborhood, city] = property.locationText.split(',').map((s: string) => s.trim());
          
          const locationData: any = {
            property_id: newProperty.id,
            city: city || 'מודיעין',
            neighborhood: neighborhood || 'מרכז',
            address: property.street || property.locationText,
          };
          
          const { error: locationError } = await supabase.from('property_location').insert(locationData);

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
        errors.push({
          property: property.title,
          error: error.message || 'Unknown error',
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      saved: savedProperties.length,
      total: posts.length,
      properties: savedProperties,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Extension API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
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