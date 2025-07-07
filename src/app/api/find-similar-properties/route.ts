import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ error: 'Missing propertyId' }, { status: 400 });
    }

    // Get the current property details
    const { data: currentProperty, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propertyError || !currentProperty) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Find similar properties based on multiple criteria
    let query = supabase
      .from('properties')
      .select(
        'id, title, location_text, price_per_month, bedrooms, square_feet, duplicate_status, property_images(image_url, is_primary)'
      )
      .neq('id', propertyId)
      .or('duplicate_status.eq.unique,duplicate_status.eq.master,duplicate_status.is.null');

    // Add filters for similarity
    if (currentProperty.bedrooms) {
      query = query.eq('bedrooms', currentProperty.bedrooms);
    }

    if (currentProperty.price_per_month) {
      const priceRange = currentProperty.price_per_month * 0.15; // 15% range
      query = query
        .gte('price_per_month', currentProperty.price_per_month - priceRange)
        .lte('price_per_month', currentProperty.price_per_month + priceRange);
    }

    if (currentProperty.square_feet) {
      const areaRange = currentProperty.square_feet * 0.2; // 20% range
      query = query
        .gte('square_feet', currentProperty.square_feet - areaRange)
        .lte('square_feet', currentProperty.square_feet + areaRange);
    }

    const { data: similarProperties, error: similarError } = await query
      .limit(10)
      .order('created_at', { ascending: false });

    if (similarError) {
      console.error('Error finding similar properties:', similarError);
      return NextResponse.json({ error: 'Failed to find similar properties' }, { status: 500 });
    }

    // Calculate similarity scores
    const propertiesWithScores = similarProperties.map((property) => {
      let score = 0;

      // Location similarity (basic text matching)
      if (currentProperty.location_text && property.location_text) {
        const currentWords = currentProperty.location_text.toLowerCase().split(/\s+/);
        const propertyWords = property.location_text.toLowerCase().split(/\s+/);
        const commonWords = currentWords.filter((word: string) => propertyWords.includes(word));
        score += (commonWords.length / Math.max(currentWords.length, propertyWords.length)) * 30;
      }

      // Price similarity
      if (currentProperty.price_per_month && property.price_per_month) {
        const priceDiff = Math.abs(currentProperty.price_per_month - property.price_per_month);
        const priceScore = Math.max(0, 30 - (priceDiff / currentProperty.price_per_month) * 100);
        score += priceScore;
      }

      // Area similarity
      if (currentProperty.square_feet && property.square_feet) {
        const areaDiff = Math.abs(currentProperty.square_feet - property.square_feet);
        const areaScore = Math.max(0, 20 - (areaDiff / currentProperty.square_feet) * 100);
        score += areaScore;
      }

      // Bedrooms match
      if (currentProperty.bedrooms === property.bedrooms) {
        score += 20;
      }

      return {
        ...property,
        similarity_score: Math.round(score),
      };
    });

    // Sort by similarity score
    propertiesWithScores.sort((a, b) => b.similarity_score - a.similarity_score);

    return NextResponse.json({
      similarProperties: propertiesWithScores.filter((r) => r.similarity_score > 20),
    });
  } catch (error) {
    console.error('Error in find-similar-properties API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
