import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Validate environment variables for admin operations
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
}
if (!serviceRoleKey) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY not found, using anon key. This may fail under RLS.');
}

// Use service role key for admin operations (with fallback for local dev)
const supabase = createClient(
  supabaseUrl,
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Helper function to delete in chunks to avoid param/URL limits
async function deleteInChunks(table: string, column: string, ids: string[], chunkSize = 500) {
  let deletedCount = 0;
  
  for (let i = 0; i < ids.length; i += chunkSize) {
    const batch = ids.slice(i, i + chunkSize);
    const { error } = await supabase
      .from(table)
      .delete()
      .in(column, batch);
    
    if (error) {
      console.error(`Error deleting from ${table} (batch ${Math.floor(i/chunkSize) + 1}):`, error);
      throw error;
    }
    
    deletedCount += batch.length;
    
    // Show progress for large deletions
    if (ids.length > chunkSize) {
      console.log(`  Deleted ${deletedCount}/${ids.length} records from ${table}`);
    }
  }
  
  return deletedCount;
}

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
    // Using chunked deletes to avoid URL/param limits

    try {
      await deleteInChunks('property_amenities', 'property_id', propertyIds);
      console.log('✓ Deleted property amenities');
    } catch (error) {
      console.error('Failed to delete property amenities:', error);
      throw error; // Fail fast to prevent FK constraint issues
    }

    try {
      await deleteInChunks('property_images', 'property_id', propertyIds);
      console.log('✓ Deleted property images');
    } catch (error) {
      console.error('Failed to delete property images:', error);
      throw error; // Fail fast to prevent FK constraint issues
    }

    try {
      await deleteInChunks('property_location', 'property_id', propertyIds);
      console.log('✓ Deleted property locations');
    } catch (error) {
      console.error('Failed to delete property locations:', error);
      throw error; // Fail fast to prevent FK constraint issues
    }

    try {
      await deleteInChunks('price_history', 'property_id', propertyIds);
      console.log('✓ Deleted price history');
    } catch (error) {
      console.error('Failed to delete price history:', error);
      throw error; // Fail fast to prevent FK constraint issues
    }

    try {
      await deleteInChunks('scrape_metadata', 'property_id', propertyIds);
      console.log('✓ Deleted scrape metadata');
    } catch (error) {
      console.error('Failed to delete scrape metadata:', error);
      throw error; // Fail fast to prevent FK constraint issues
    }

    // Finally, delete the properties themselves
    // For properties, we can use a simpler query since we're filtering by source_platform
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
