import { PropertyGrid } from '@/components/property-grid';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

interface ReviewPropertiesPageProps {
  params: Promise<{
    page: string;
  }>;
}

export default async function ReviewPropertiesPageWithPagination({ params }: ReviewPropertiesPageProps) {
  const { page } = await params;
  const pageNumber = parseInt(page) || 1;

  return (
    <>
      <Yad2ScraperWrapper />
      <section>
        <PropertyGrid listingType="review" initialPage={pageNumber} />
      </section>
    </>
  );
}