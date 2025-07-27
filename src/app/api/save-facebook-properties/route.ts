import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { properties: propertiesToSave } = await request.json();

    if (!propertiesToSave || !Array.isArray(propertiesToSave)) {
      return NextResponse.json({ error: 'Invalid properties data' }, { status: 400 });
    }

    const savedProperties = [];
    const errors = [];

    for (const property of propertiesToSave) {
      try {
        // Prepare property data
        const propertyData = {
          title: property.title,
          price_per_month: parseFloat(property.pricePerMonth) || 0,
          currency: property.currency === '₪' ? 'ILS' : property.currency || 'ILS',
          bedrooms: property.bedrooms || null,
          bathrooms: property.bathrooms ? parseFloat(property.bathrooms) : null,
          property_type: 'דירה',
          available_date: property.availableFrom || new Date().toISOString().split('T')[0],
          is_active: true,
          listing_type: property.listingType || 'rent',
          source_platform: 'facebook', // Always 'facebook' for this endpoint
          source_url: property.sourceUrl || 'https://www.facebook.com',
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

        // Insert location if we have city/neighborhood
        if (property.locationText && newProperty) {
          const [city, neighborhood] = property.locationText
            .split(',')
            .map((s: string) => s.trim());

          const { error: locationError } = await supabase.from('property_location').insert({
            property_id: newProperty.id,
            city: city || 'מודיעין',
            neighborhood: neighborhood || city || 'מרכז',
            address: property.street || property.locationText,
          });

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
          // Map Hebrew amenity names to database columns
          const amenityMapping: Record<string, string> = {
            מעלית: 'elevator',
            חניה: 'parking',
            מרפסת: 'balcony',
            'ממ״ד': 'safe_room',
            מזגן: 'air_conditioning',
            'ריהוט מלא': 'furnished',
            מחסן: 'storage',
            גינה: 'garden',
            'דוד שמש': 'solar_water_heater',
          };

          // Build amenity data object
          const amenityData: any = {
            property_id: newProperty.id,
          };

          // Set boolean values for amenities
          property.amenities.forEach((amenityName: string) => {
            const dbColumn = amenityMapping[amenityName];
            if (dbColumn) {
              amenityData[dbColumn] = true;
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
      count: savedProperties.length,
      properties: savedProperties,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
