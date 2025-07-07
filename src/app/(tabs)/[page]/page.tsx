import { PropertyGrid } from '@/components/property-grid';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

interface AllPropertiesPageProps {
  params: Promise<{
    page: string;
  }>;
}

export default async function AllPropertiesPageWithPagination({ params }: AllPropertiesPageProps) {
  const { page } = await params;
  const pageNumber = parseInt(page) || 1;

  return (
    <>
      <Yad2ScraperWrapper />
      <section>
        <PropertyGrid listingType="all" initialPage={pageNumber} />
      </section>
    </>
  );
}
