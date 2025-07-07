import { Yad2ScraperFirecrawl } from './src/lib/scrapers/yad2-scraper-firecrawl';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testFirecrawlScraper() {
  try {
    const scraper = new Yad2ScraperFirecrawl();

    const url = 'https://www.yad2.co.il/realestate/forsale?city=1200&minRooms=3';
    console.log('Testing Firecrawl scraper with URL:', url);
    console.log('API Key available:', !!process.env.FIRECRAWL_API_KEY);

    const listings = await scraper.scrapeSearchResults(url, 3);

    console.log(`\nFound ${listings.length} listings:`);
    listings.forEach((listing, index) => {
      console.log(`\n${index + 1}. ${listing.title}`);
      console.log(`   Price: ${listing.currency}${listing.price}`);
      console.log(`   Location: ${listing.location}`);
      console.log(`   Rooms: ${listing.rooms}`);
      console.log(`   URL: ${listing.listing_url}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testFirecrawlScraper();
