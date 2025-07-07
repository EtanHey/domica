import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { keepPropertyId, mergePropertyIds } = await request.json();

    if (!keepPropertyId || !mergePropertyIds || mergePropertyIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get all properties to merge
    const { data: propertiesToMerge, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .in('id', [...mergePropertyIds, keepPropertyId]);

    if (fetchError || !propertiesToMerge) {
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    // Find the property to keep
    const keepProperty = propertiesToMerge.find((r) => r.id === keepPropertyId);
    if (!keepProperty) {
      return NextResponse.json({ error: 'Keep property not found' }, { status: 404 });
    }

    // Start transaction-like operations
    const updates: Promise<any>[] = [];

    // 1. Update the keep property with merged information
    const mergedData: any = { ...keepProperty };

    // Merge data from other properties (keeping non-null values)
    propertiesToMerge.forEach((property) => {
      if (property.id === keepPropertyId) return;

      // Merge descriptions
      if (
        property.description &&
        (!mergedData.description || property.description.length > mergedData.description.length)
      ) {
        mergedData.description = property.description;
      }

      // Keep earliest scraped date
      if (
        property.scraped_at &&
        (!mergedData.scraped_at || new Date(property.scraped_at) < new Date(mergedData.scraped_at))
      ) {
        mergedData.scraped_at = property.scraped_at;
      }

      // Keep highest price (or lowest, depending on business logic)
      if (property.price_per_month && property.price_per_month > mergedData.price_per_month) {
        mergedData.price_per_month = property.price_per_month;
      }
    });

    // Update the keep property as master
    updates.push(
      (async () => {
        const { error } = await supabase
          .from('properties')
          .update({
            ...mergedData,
            duplicate_status: 'master',
            duplicate_score: null,
            master_property_id: null,
          })
          .eq('id', keepPropertyId);
        return { error };
      })()
    );

    // 2. Mark other properties as duplicates pointing to the master
    mergePropertyIds.forEach((propertyId: string) => {
      if (propertyId !== keepPropertyId) {
        updates.push(
          (async () => {
            const { error } = await supabase
              .from('properties')
              .update({
                duplicate_status: 'duplicate',
                master_property_id: keepPropertyId,
                duplicate_score: 100, // Perfect match since manually merged
              })
              .eq('id', propertyId);
            return { error };
          })()
        );
      }
    });

    // 3. Transfer all images to the master property
    const { data: allImages } = await supabase
      .from('property_images')
      .select('*')
      .in('property_id', mergePropertyIds);

    if (allImages && allImages.length > 0) {
      // Get existing images for the keep property
      const keepPropertyImages = allImages.filter((img) => img.property_id === keepPropertyId);
      const otherImages = allImages.filter((img) => img.property_id !== keepPropertyId);

      // Add other images to the keep property (avoiding duplicates)
      const imageUrls = new Set(keepPropertyImages.map((img) => img.image_url));
      const newImages = otherImages.filter((img) => !imageUrls.has(img.image_url));

      if (newImages.length > 0) {
        updates.push(
          (async () => {
            const { error } = await supabase.from('property_images').insert(
              newImages.map((img, index) => ({
                ...img,
                property_id: keepPropertyId,
                image_order: keepPropertyImages.length + index + 1,
                is_primary: false, // Keep existing primary
              }))
            );
            return { error };
          })()
        );
      }
    }

    // Execute all updates
    const results = await Promise.all(updates);
    const hasError = results.some((result) => result.error);

    if (hasError) {
      console.error(
        'Merge errors:',
        results.filter((r) => r.error)
      );
      return NextResponse.json({ error: 'Failed to merge properties' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      masterId: keepPropertyId,
      mergedCount: mergePropertyIds.length - 1,
    });
  } catch (error) {
    console.error('Error in merge-duplicates API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
