import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function clearFacebookProperties() {
  try {
    console.log('🗑️  Starting to clear Facebook properties...');

    // First, get all Facebook property IDs
    const { data: facebookProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id')
      .eq('source_platform', 'facebook');

    if (fetchError) {
      console.error('Error fetching Facebook properties:', fetchError);
      return;
    }

    if (!facebookProperties || facebookProperties.length === 0) {
      console.log('No Facebook properties found to delete.');
      return;
    }

    const propertyIds = facebookProperties.map((p) => p.id);
    console.log(`Found ${propertyIds.length} Facebook properties to delete.`);

    // Delete related records first (due to foreign key constraints)

    // Delete property amenities
    const { error: amenitiesError } = await supabase
      .from('property_amenities')
      .delete()
      .in('property_id', propertyIds);

    if (amenitiesError) {
      console.error('Error deleting property amenities:', amenitiesError);
    } else {
      console.log('✓ Deleted property amenities');
    }

    // Delete property images
    const { error: imagesError } = await supabase
      .from('property_images')
      .delete()
      .in('property_id', propertyIds);

    if (imagesError) {
      console.error('Error deleting property images:', imagesError);
    } else {
      console.log('✓ Deleted property images');
    }

    // Delete property locations
    const { error: locationsError } = await supabase
      .from('property_location')
      .delete()
      .in('property_id', propertyIds);

    if (locationsError) {
      console.error('Error deleting property locations:', locationsError);
    } else {
      console.log('✓ Deleted property locations');
    }

    // Delete price history
    const { error: priceHistoryError } = await supabase
      .from('price_history')
      .delete()
      .in('property_id', propertyIds);

    if (priceHistoryError) {
      console.error('Error deleting price history:', priceHistoryError);
    } else {
      console.log('✓ Deleted price history');
    }

    // Delete scrape metadata
    const { error: metadataError } = await supabase
      .from('scrape_metadata')
      .delete()
      .in('property_id', propertyIds);

    if (metadataError) {
      console.error('Error deleting scrape metadata:', metadataError);
    } else {
      console.log('✓ Deleted scrape metadata');
    }

    // Finally, delete the properties themselves
    const { error: propertiesError } = await supabase
      .from('properties')
      .delete()
      .eq('source_platform', 'facebook');

    if (propertiesError) {
      console.error('Error deleting properties:', propertiesError);
    } else {
      console.log(`✓ Successfully deleted ${propertyIds.length} Facebook properties`);
    }

    console.log('🎉 Facebook properties cleanup completed!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the cleanup
clearFacebookProperties();
