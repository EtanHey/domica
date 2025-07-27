import { ScrapingLayout } from '@/components/scraping-layout';
import { FacebookParser } from '@/components/facebook-parser';

export default function FacebookScrapingPage() {
  return (
    <ScrapingLayout
      title="נכסים מפייסבוק"
      description="נכסים שנאספו מקבוצות פייסבוק באמצעות AI"
      sourcePlatform="facebook"
      showScraperComponent={true}
      scraperComponent={<FacebookParser />}
    />
  );
}
