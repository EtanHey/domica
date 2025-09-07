import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { properties } = await request.json();
    
    if (!properties || !Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: 'לא נמצאו נכסים לשמירה' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const savedProperties = [];
    const updatedProperties = [];
    const skippedDuplicates = [];
    const errors = [];

    for (const madlanProperty of properties) {
      try {
        // Check for existing property with same source_id to avoid duplicates
        const { data: existingProperty } = await supabase
          .from('properties')
          .select('id, title, price_per_month, updated_at')
          .eq('source_platform', 'madlan')
          .eq('source_id', madlanProperty.id)
          .single();

        if (existingProperty) {
          console.log(`Property already exists: ${existingProperty.title} (ID: ${existingProperty.id})`);
          
          // Update last_seen_at to track that we saw it again
          const priceChanged = existingProperty.price_per_month !== madlanProperty.price;
          
          await supabase
            .from('properties')
            .update({ 
              last_seen_at: new Date().toISOString(),
              price_per_month: madlanProperty.price, // Update price in case it changed
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProperty.id);
          
          // Track price history if price changed
          if (priceChanged) {
            await supabase
              .from('price_history')
              .insert({
                property_id: existingProperty.id,
                price: madlanProperty.price,
                price_change_amount: madlanProperty.price - existingProperty.price_per_month
              });
          }
          
          updatedProperties.push({
            ...existingProperty,
            priceChanged,
            oldPrice: existingProperty.price_per_month,
            newPrice: madlanProperty.price
          });
          skippedDuplicates.push(madlanProperty.title);
          continue; // Skip to next property
        }

        // Parse entry date
        let availableDate = null;
        if (madlanProperty.entryDate) {
          if (madlanProperty.entryDate === 'מיידי' || madlanProperty.entryDate.includes('מיידי')) {
            availableDate = new Date().toISOString().split('T')[0]; // Today
          } else if (madlanProperty.entryDate.match(/^\d{2}\/\d{4}$/)) {
            // Format: MM/YYYY
            const [month, year] = madlanProperty.entryDate.split('/');
            availableDate = `${year}-${month.padStart(2, '0')}-01`;
          } else if (madlanProperty.entryDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            // Format: DD/MM/YYYY
            const [day, month, year] = madlanProperty.entryDate.split('/');
            availableDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }

        // Check for potential duplicates by address and price (fuzzy matching)
        if (madlanProperty.address && madlanProperty.city) {
          const { data: similarProperties } = await supabase
            .from('properties')
            .select('id, title, price_per_month')
            .eq('source_platform', 'madlan')
            .ilike('title', `%${madlanProperty.address}%`)
            .gte('price_per_month', madlanProperty.price * 0.9) // Within 10% price range
            .lte('price_per_month', madlanProperty.price * 1.1);

          if (similarProperties && similarProperties.length > 0) {
            console.warn(`⚠️ Potential duplicate found for: ${madlanProperty.title}`);
            console.warn('Similar properties:', similarProperties.map(p => ({ id: p.id, title: p.title, price: p.price_per_month })));
            // Still continue with insertion but log the warning
          }
        }

        // Insert main property
        const { data: property, error: propertyError } = await supabase
          .from('properties')
          .insert({
            title: madlanProperty.title,
            description: madlanProperty.description || null,
            price_per_month: madlanProperty.price,
            currency: 'ILS',
            bedrooms: Math.floor(madlanProperty.rooms),
            bathrooms: null,
            square_meters: madlanProperty.area || null,
            property_type: madlanProperty.propertyType,
            available_date: availableDate,
            is_active: true,
            listing_type: 'rent',
            source_platform: 'madlan',
            source_id: madlanProperty.id,
            source_url: madlanProperty.sourceUrl || null,
            phone_normalized: madlanProperty.contactPhone,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            scraped_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (propertyError) {
          console.error('Error saving property:', propertyError);
          errors.push({ property: madlanProperty.title, error: propertyError.message });
          continue;
        }

        if (!property) {
          errors.push({ property: madlanProperty.title, error: 'לא נוצר נכס' });
          continue;
        }

        // Insert location data
        if (madlanProperty.address || madlanProperty.city || madlanProperty.neighborhood) {
          const { error: locationError } = await supabase
            .from('property_location')
            .insert({
              property_id: property.id,
              address: madlanProperty.address || null,
              city: madlanProperty.city || null,
              neighborhood: madlanProperty.neighborhood || null,
              formatted_address: [madlanProperty.address, madlanProperty.neighborhood, madlanProperty.city]
                .filter(Boolean)
                .join(', '),
            });

          if (locationError) {
            console.error('Error saving location:', locationError);
          }
        }

        // Insert images
        if (madlanProperty.images && madlanProperty.images.length > 0) {
          const imageInserts = madlanProperty.images.map((imageUrl: string, index: number) => ({
            property_id: property.id,
            image_url: imageUrl,
            image_order: index,
            is_primary: index === 0,
          }));

          const { error: imagesError } = await supabase
            .from('property_images')
            .insert(imageInserts);

          if (imagesError) {
            console.error('Error saving images:', imagesError);
          }
        }

        // Handle amenities
        if (madlanProperty.amenities && madlanProperty.amenities.length > 0) {
          const amenityData: any = {
            property_id: property.id,
            parking: madlanProperty.amenities.includes('חניה') ? 1 : 0,
            elevator: madlanProperty.amenities.includes('מעלית'),
            balcony: madlanProperty.amenities.includes('מרפסת') ? 1 : 0,
            air_conditioning: madlanProperty.amenities.includes('מיזוג אוויר'),
            ac_unit: madlanProperty.amenities.includes('מזגן'),
            heating: madlanProperty.amenities.includes('חימום'),
            internet: madlanProperty.amenities.includes('אינטרנט'),
            laundry: madlanProperty.amenities.includes('כביסה'),
            equipped_kitchen: madlanProperty.amenities.includes('מטבח מצויד'),
            shower: madlanProperty.amenities.includes('מקלחת'),
            bathtub: madlanProperty.amenities.includes('אמבטיה'),
            storage: madlanProperty.amenities.includes('מחסן'),
            garden: madlanProperty.amenities.includes('גינה') ? 1 : 0,
            secured: madlanProperty.amenities.includes('מאובטח'),
            accessible: madlanProperty.amenities.includes('גישה לנכים') || madlanProperty.amenities.includes('נגיש לנכים'),
            bars: madlanProperty.amenities.includes('סורגים'),
            steel_door: madlanProperty.amenities.includes('דלת פלדה'),
            yard: madlanProperty.amenities.includes('חצר'),
            roof: madlanProperty.amenities.includes('גג'),
            safe_room: madlanProperty.amenities.includes('ממ"ד') || madlanProperty.amenities.includes('ממ״ד'),
          };

          const { error: amenitiesError } = await supabase
            .from('property_amenities')
            .insert(amenityData);

          if (amenitiesError) {
            console.error('Error saving amenities:', amenitiesError);
          }
        }

        // Insert landlord if contact info exists
        if (madlanProperty.contactName) {
          const { data: existingLandlord } = await supabase
            .from('landlords')
            .select('id')
            .eq('name', madlanProperty.contactName)
            .single();

          if (!existingLandlord) {
            const { data: newLandlord } = await supabase
              .from('landlords')
              .insert({
                name: madlanProperty.contactName,
                phone_number: madlanProperty.contactPhone,
              })
              .select()
              .single();

            if (newLandlord) {
              await supabase
                .from('properties')
                .update({ landlord_id: newLandlord.id })
                .eq('id', property.id);
            }
          } else {
            await supabase
              .from('properties')
              .update({ landlord_id: existingLandlord.id })
              .eq('id', property.id);
          }
        }

        savedProperties.push(property);
      } catch (error) {
        console.error('Error processing property:', madlanProperty.title, error);
        errors.push({ property: madlanProperty.title, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: savedProperties.length,
      updatedCount: updatedProperties.length,
      skippedDuplicates: skippedDuplicates.length,
      totalCount: properties.length,
      summary: {
        new: savedProperties.length,
        updated: updatedProperties.length,
        skipped: skippedDuplicates.length,
        errors: errors.length
      },
      updatedProperties: updatedProperties.length > 0 ? updatedProperties : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Save properties error:', error);
    return NextResponse.json(
      { error: 'שגיאה בשמירת הנכסים' },
      { status: 500 }
    );
  }
}