import { RentalGridWrapper } from '@/components/rental-grid-wrapper';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

export default function HomePage() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="mb-8 text-center">
        <p className="text-muted-foreground text-lg">מצא את הדירה המושלמת שלך</p>
      </div>

      <Yad2ScraperWrapper />

      <section>
        <h2 className="mb-4 text-2xl font-semibold">דירות להשכרה</h2>
        <RentalGridWrapper />
      </section>
    </div>
  );
}
