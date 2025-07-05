import { NextRequest, NextResponse } from 'next/server';
import { Yad2Scraper } from '@/lib/yad2-scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, maxListings = 10 } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate it's a Yad2 URL
    if (!url.includes('yad2.co.il')) {
      return NextResponse.json({ error: 'Please provide a valid Yad2 URL' }, { status: 400 });
    }

    // Check if API key exists
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json({ error: 'Firecrawl API key not configured' }, { status: 500 });
    }

    // Use real scraper
    const scraper = new Yad2Scraper(process.env.FIRECRAWL_API_KEY);
    const result = await scraper.scrapeAndSave(url, maxListings);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Yad2 scraping error:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape Yad2',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if scraper is available
export async function GET() {
  return NextResponse.json({
    available: true,
    service: 'Yad2 Scraper',
    requiresApiKey: !process.env.FIRECRAWL_API_KEY,
  });
}
