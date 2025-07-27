import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { posts } = await request.json();

    if (!posts || typeof posts !== 'string') {
      return NextResponse.json({ error: 'Invalid posts data' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are an expert at parsing Hebrew rental property listings from Facebook posts. 
Extract structured data from the posts and return it as JSON.

IMPORTANT: Remove duplicate posts! If you see the same property posted multiple times (same price, rooms, location, phone), 
only include it ONCE in your output. Look for identical or near-identical content.

For each UNIQUE rental post, extract:
- price: Monthly rent price (number only, no currency symbols)
- rooms: Number of rooms (as a number, e.g., 3.5)
- city: City name in Hebrew
- neighborhood: Neighborhood/area name in Hebrew
- street: Street name if mentioned
- floor: Floor number
- totalFloors: Total floors in building if mentioned
- size: Size in square meters if mentioned
- amenities: Array of amenities in Hebrew (מעלית, חניה, מרפסת, ממ״ד, מזגן, תכולה חדשה, מטבח מעוצב, etc.)
- contactPhone: Phone number if provided
- contactName: Contact person name if mentioned
- availableFrom: Date available (as string, e.g., "1.9.25")
- description: Brief description of the property
- isValid: true if this is a valid rental post, false if not
- isDuplicate: true if this is a duplicate of another post in the list

Return an array of parsed properties in JSON format.
Filter out any posts where isDuplicate is true.
If a post is not about rental property, set isValid to false.
Be lenient with parsing - extract whatever information is available.`;

    const userPrompt = `Parse these Facebook rental posts into structured data:

${posts}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract JSON from Claude's response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to parse the JSON response
    let parsedProperties;
    try {
      // Look for JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedProperties = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.log('Raw response:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: responseText },
        { status: 500 }
      );
    }

    // Transform to match our Property interface
    const properties = parsedProperties
      .filter((p: any) => p.isValid !== false && !p.isDuplicate)
      .map((item: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        title: item.rooms
          ? `דירת ${item.rooms} חדרים ב${item.neighborhood || item.city}`
          : `דירה להשכרה ב${item.city}`,
        pricePerMonth: (item.price || 0).toString(),
        currency: '₪',
        locationText: `${item.neighborhood || 'מרכז'}, ${item.city || 'מודיעין'}`,
        bedrooms: item.rooms || null,
        bathrooms: null,
        images: [
          {
            imageUrl: '/placeholder-rental.jpg',
            isPrimary: true,
          },
        ],
        duplicateStatus: null,
        duplicateScore: null,
        listingType: 'rent',
        description: item.description || '',
        amenities: item.amenities || [],
        contactPhone: item.contactPhone,
        floor: item.floor || null,
        source: 'facebook',
        sourceUrl: 'https://www.facebook.com',
        // Additional parsed data
        street: item.street,
        size: item.size,
        availableFrom: item.availableFrom,
      }));

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties,
      rawParsed: parsedProperties, // For debugging
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
