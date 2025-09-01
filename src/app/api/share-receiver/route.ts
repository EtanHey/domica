import { NextRequest, NextResponse } from 'next/server';

// This endpoint receives shared content from mobile apps
export async function POST(request: NextRequest) {
  try {
    const { text, url, title } = await request.json();

    // Parse Facebook mobile URLs
    const fbUrlMatch = url?.match(/facebook\.com\/groups\/(\d+)\/permalink\/(\d+)/);

    // Extract rental info from shared text
    const extractRentalInfo = (sharedText: string) => {
      const info: any = {};

      // Price extraction
      const priceMatch = sharedText.match(
        /(?:₪|ש"ח)\s*(\d{1,2},?\d{3})|(\d{1,2},?\d{3})\s*(?:₪|ש"ח)/
      );
      if (priceMatch) {
        info.price = priceMatch[1] || priceMatch[2];
      }

      // Rooms extraction
      const roomsMatch = sharedText.match(/(\d+(?:\.\d+)?)\s*(?:חדרים|חד')/);
      if (roomsMatch) {
        info.rooms = parseFloat(roomsMatch[1]);
      }

      // Phone extraction
      const phoneMatch = sharedText.match(/05\d{8}/);
      if (phoneMatch) {
        info.phone = phoneMatch[0];
      }

      return info;
    };

    const rentalInfo = extractRentalInfo(text || '');

    return NextResponse.json({
      success: true,
      data: {
        text,
        url,
        title,
        groupId: fbUrlMatch?.[1],
        postId: fbUrlMatch?.[2],
        extracted: rentalInfo,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process shared content' }, { status: 500 });
  }
}
