import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️  Starting to clear Facebook properties...');

    // First, get all Facebook property IDs
    const { data: facebookProperties, error: fetchError } = await supabase
      .from('properties')
      .select('id')
      .eq('source_platform', 'facebook');

    if (fetchError) {
      console.error('Error fetching Facebook properties:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    if (!facebookProperties || facebookProperties.length === 0) {
      return NextResponse.json({ message: 'No Facebook properties found to delete' });
    }

    const propertyIds = facebookProperties.map((p) => p.id);
    console.log(`Found ${propertyIds.length} Facebook properties to delete.`);

    // Delete related records first (due to foreign key constraints)
    const deletions = [];

    // Delete property amenities
    deletions.push(supabase.from('property_amenities').delete().in('property_id', propertyIds));

    // Delete property images
    deletions.push(supabase.from('property_images').delete().in('property_id', propertyIds));

    // Delete property locations
    deletions.push(supabase.from('property_location').delete().in('property_id', propertyIds));

    // Delete price history
    deletions.push(supabase.from('price_history').delete().in('property_id', propertyIds));

    // Delete scrape metadata
    deletions.push(supabase.from('scrape_metadata').delete().in('property_id', propertyIds));

    // Wait for all related deletions
    await Promise.all(deletions);

    // Finally, delete the properties themselves
    const { error: propertiesError } = await supabase
      .from('properties')
      .delete()
      .eq('source_platform', 'facebook');

    if (propertiesError) {
      console.error('Error deleting properties:', propertiesError);
      return NextResponse.json({ error: 'Failed to delete properties' }, { status: 500 });
    }

    console.log(`✓ Successfully deleted ${propertyIds.length} Facebook properties`);

    return NextResponse.json({
      success: true,
      deleted: propertyIds.length,
      message: `Successfully deleted ${propertyIds.length} Facebook properties`,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, price_per_month')
      .eq('source_platform', 'facebook');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: data?.length || 0,
      properties: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
