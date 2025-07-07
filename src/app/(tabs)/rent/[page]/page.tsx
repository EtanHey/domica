import { PropertyGrid } from '@/components/property-grid';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

interface RentPropertiesPageProps {
  params: Promise<{
    page: string;
  }>;
}

export default async function RentPropertiesPageWithPagination({ params }: RentPropertiesPageProps) {
  const { page } = await params;
  const pageNumber = parseInt(page) || 1;

  return (
    <>
      <Yad2ScraperWrapper />
      <section>
        <PropertyGrid listingType="rent" initialPage={pageNumber} />
      </section>
    </>
  );
}