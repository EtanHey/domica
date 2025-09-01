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
    const duplicates = [];

    for (const property of propertiesToSave) {
      try {
        // Check for duplicates before saving
        const pricePerMonth = parseFloat(property.pricePerMonth) || 0;
        const phoneNormalized = property.contactPhone?.replace(/\D/g, '') || null;

        // Build duplicate check query
        let duplicateQuery = supabase
          .from('properties')
          .select('id, title, source_platform')
          .eq('price_per_month', pricePerMonth)
          .eq('bedrooms', property.bedrooms || null)
          .eq('source_platform', 'facebook')
          .eq('is_active', true);

        // Add phone check if available
        if (phoneNormalized) {
          duplicateQuery = duplicateQuery.eq('phone_normalized', phoneNormalized);
        }

        const { data: existingProperties, error: duplicateCheckError } = await duplicateQuery;

        if (duplicateCheckError) {
          console.error('Duplicate check error:', duplicateCheckError);
        } else if (existingProperties && existingProperties.length > 0) {
          // Check location similarity for potential duplicates
          if (property.locationText) {
            const [newCity] = property.locationText.split(',').map((s: string) => s.trim());

            // Get locations for existing properties
            const propertyIds = existingProperties.map((p) => p.id);
            const { data: locations } = await supabase
              .from('property_location')
              .select('property_id, city, neighborhood')
              .in('property_id', propertyIds);

            // Check if any have matching city
            const isDuplicate = locations?.some(
              (loc) => loc.city?.toLowerCase() === newCity?.toLowerCase()
            );

            if (isDuplicate) {
              duplicates.push({
                property: property.title,
                reason: 'דירה דומה כבר קיימת במערכת',
                existing: existingProperties[0].title,
              });
              continue; // Skip this property
            }
          }
        }

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

    // Determine overall success based on whether any properties were saved
    const success = savedProperties.length > 0;
    const hasErrors = errors.length > 0;
    const hasDuplicates = duplicates.length > 0;

    // If all properties failed to save, return error status
    if (savedProperties.length === 0 && errors.length > 0 && duplicates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save any properties',
          details: errors,
        },
        { status: 500 }
      );
    }

    // Build detailed message
    let message = '';
    if (savedProperties.length > 0) {
      message += `נשמרו ${savedProperties.length} דירות חדשות`;
    }
    if (hasDuplicates) {
      message += message ? ', ' : '';
      message += `${duplicates.length} דירות כבר קיימות במערכת`;
    }
    if (hasErrors) {
      message += message ? ', ' : '';
      message += `${errors.length} דירות נכשלו`;
    }
    message = message || 'לא נשמרו דירות חדשות';

    // Return with appropriate status
    return NextResponse.json({
      success,
      count: savedProperties.length,
      total: propertiesToSave.length,
      duplicatesFound: duplicates.length,
      properties: savedProperties,
      errors: hasErrors ? errors : undefined,
      duplicates: hasDuplicates ? duplicates : undefined,
      message,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
