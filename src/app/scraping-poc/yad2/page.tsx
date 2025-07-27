import { ScrapingLayout } from '@/components/scraping-layout';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

export default function Yad2ScrapingPage() {
  return (
    <ScrapingLayout
      title="PoC חיפוש ויד2"
      description="הדגמה של מערכת חיפוש וגירוד נתונים מיד2"
      sourcePlatform="yad2"
      showScraperComponent={true}
      scraperComponent={<Yad2ScraperWrapper />}
    />
  );
}
