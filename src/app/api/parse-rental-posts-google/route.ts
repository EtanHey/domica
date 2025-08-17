import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { processImageOrPdf } from '@/lib/google-document-ai';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { documents, mode = 'google' } = await request.json();

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({ error: 'No documents provided' }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID) {
      return NextResponse.json({ error: 'Google Document AI not configured' }, { status: 500 });
    }

    // Process all documents with Google Document AI
    const extractedTexts: string[] = [];
    
    for (const doc of documents) {
      try {
        let mimeType = 'application/pdf';
        
        // Detect mime type from data URL
        if (doc.startsWith('data:')) {
          const match = doc.match(/^data:(.+?);/);
          if (match) {
            mimeType = match[1];
          }
        }
        
        // Process with Google Document AI
        const text = await processImageOrPdf(doc, mimeType);
        extractedTexts.push(text);
      } catch (error: any) {
        console.error('Document processing error:', error);
        extractedTexts.push(''); // Add empty string for failed documents
      }
    }

    // Combine all extracted texts
    const combinedText = extractedTexts.join('\n\n---\n\n');

    if (!combinedText.trim()) {
      return NextResponse.json({ error: 'No text extracted from documents' }, { status: 400 });
    }

    // Now use Claude to parse the extracted text
    const systemPrompt = `You are an expert at parsing Hebrew rental property listings. 
Extract structured data from the OCR text and return it as JSON.

IMPORTANT: 
- The text may contain OCR errors, be lenient with parsing
- Extract ONLY the city/location explicitly mentioned in the text
- If no city is mentioned, use "לא צוין"
- Remove duplicate posts

For each UNIQUE rental post, extract:
- price: Monthly rent price (number only, no currency symbols)
- rooms: Number of rooms (as a number, e.g., 3.5)
- city: City name in Hebrew (EXACTLY as written in the text)
- neighborhood: Neighborhood/area name in Hebrew
- street: Street name if mentioned
- floor: Floor number
- totalFloors: Total floors in building if mentioned
- size: Size in square meters if mentioned
- amenities: Array of amenities in Hebrew
- contactPhone: Phone number if provided
- contactName: Contact person name if mentioned
- availableFrom: Date available (as string)
- description: Brief description of the property
- isValid: true if this is a valid rental post, false if not
- isDuplicate: true if this is a duplicate of another post in the list

Return an array of parsed properties in JSON format.`;

    const userPrompt = `Parse this OCR-extracted text from Facebook rental posts into structured data:

${combinedText}`;

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
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedProperties = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
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
          : `דירה להשכרה ב${item.city || 'לא צוין'}`,
        pricePerMonth: (item.price || 0).toString(),
        currency: '₪',
        locationText: `${item.neighborhood || 'מרכז'}, ${item.city || 'לא צוין'}`,
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
        street: item.street,
        size: item.size,
        availableFrom: item.availableFrom,
      }));

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties,
      extractedText: combinedText, // For debugging
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}