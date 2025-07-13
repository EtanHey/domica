import { PropertyGrid } from '@/components/property-grid';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

export default function ScrapingPocPage() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">PoC חיפוש ויד2</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">הדגמה של מערכת חיפוש וגירוד נתונים מיד2</p>
      </div>
      
      <Yad2ScraperWrapper />
      
      <section>
        <PropertyGrid listingType="all" initialPage={1} />
      </section>
    </div>
  );
}