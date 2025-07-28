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

function extractNeighborhoodFromText(text: string): string | null {
  const neighborhoods = [
    'מורשת', 'נופים', 'קייזר', 'הנביאים', 'אבני חן', 'ציפורים',
    'צמח השדה', 'שמעון פרס', 'גולדה מאיר'
  ];
  
  for (const neighborhood of neighborhoods) {
    if (text.includes(neighborhood)) {
      return neighborhood;
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

    // Process each post with Claude to extract structured data
    const processPromises = posts.map(async (post: any, index: number) => {
      try {
        // Create a prompt for Claude to extract structured data
        const prompt = `Extract rental property information from this Facebook post and return ONLY valid JSON:

Author: ${post.author}
Text: ${post.text}
Phone numbers found: ${post.phones?.join(', ') || 'none'}
Prices found: ${post.rawPrices?.join(', ') || 'none'}

Return a JSON object with these fields (use null for missing data):
{
  "price": number or null,
  "rooms": number or null,
  "city": "מודיעין" or other city in Hebrew,
  "neighborhood": neighborhood name in Hebrew or null,
  "street": street name if mentioned or null,
  "floor": floor number or null,
  "size": size in sqm or null,
  "amenities": ["array", "of", "amenities", "in", "Hebrew"],
  "contactPhone": "phone number" or null,
  "availableFrom": "date string" or null,
  "description": "brief description in Hebrew"
}

IMPORTANT: Return ONLY the JSON object, no explanations.`;

        let responseText = '';
        try {
          const message = await anthropic.messages.create({
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

          responseText = message.content[0].type === 'text' ? message.content[0].text : '';
          console.log('Claude response:', responseText.substring(0, 200) + '...');
        } catch (apiError) {
          console.error('Claude API error:', apiError);
          // Use fallback extraction without Claude
          responseText = '';
        }
        
        // Parse the JSON response
        let extractedData;
        try {
          // Try to extract JSON from Claude's response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        } catch (e) {
          console.error('Failed to parse Claude response, using fallback extraction');
          // Fallback: Extract data directly from the post
          extractedData = {
            price: post.rawPrices?.[0] ? parseInt(post.rawPrices[0].replace(/,/g, '')) : null,
            rooms: extractRoomsFromText(post.text),
            city: 'מודיעין',
            neighborhood: extractNeighborhoodFromText(post.text),
            street: null,
            floor: null,
            size: null,
            amenities: extractAmenitiesFromText(post.text),
            contactPhone: post.phones?.[0] || null,
            availableFrom: null,
            description: post.text.substring(0, 500)
          };
        }

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