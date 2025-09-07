import { ScrapingLayout } from '@/components/scraping-layout';
import { MadlanScraperWrapper } from '@/components/madlan-scraper-wrapper';

export default function MadlanScrapingPage() {
  return (
    <ScrapingLayout
      title="PoC חיפוש מדלן"
      description="הדגמה של מערכת חיפוש וגירוד נתונים ממדלן"
      sourcePlatform="madlan"
      showScraperComponent={true}
      scraperComponent={<MadlanScraperWrapper />}
    />
  );
}