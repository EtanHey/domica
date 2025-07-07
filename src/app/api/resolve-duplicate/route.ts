import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { propertyId, decision, masterPropertyId } = await request.json();

    if (!propertyId || !decision) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate decision
    if (!['unique', 'duplicate', 'keep_review'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    let updateData: any = {};

    if (decision === 'unique') {
      // Mark as unique - no duplicate
      updateData = {
        duplicate_status: 'unique',
        master_property_id: null,
        duplicate_score: null,
      };
    } else if (decision === 'duplicate' && masterPropertyId) {
      // Mark as duplicate of the master property
      updateData = {
        duplicate_status: 'duplicate',
        master_property_id: masterPropertyId,
        duplicate_score: 90, // High confidence since manually confirmed
      };
    } else if (decision === 'keep_review') {
      // Keep in review status
      updateData = {
        duplicate_status: 'review',
      };
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If marking as duplicate, update the master property status if needed
    if (decision === 'duplicate' && masterPropertyId) {
      await supabase
        .from('properties')
        .update({ duplicate_status: 'master' })
        .eq('id', masterPropertyId);
    }

    return NextResponse.json({
      success: true,
      property: data,
      message:
        decision === 'duplicate'
          ? 'נכס סומן ככפול'
          : decision === 'unique'
            ? 'נכס סומן כייחודי'
            : 'נכס נשאר לבדיקה',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
