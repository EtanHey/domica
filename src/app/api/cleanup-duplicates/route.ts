import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get all confirmed duplicates
    const { data: duplicates, error: fetchError } = await supabase
      .from('properties')
      .select('id, title, duplicate_status, duplicate_score')
      .eq('duplicate_status', 'duplicate');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({
      count: duplicates?.length || 0,
      duplicates: duplicates || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Delete all confirmed duplicates
    const { error, count } = await supabase
      .from('properties')
      .delete()
      .eq('duplicate_status', 'duplicate');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: count,
      message: `Successfully deleted ${count} duplicate properties`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
