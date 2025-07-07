import { PropertyGrid } from '@/components/property-grid';
import { Yad2ScraperWrapper } from '@/components/yad2-scraper-wrapper';

interface SalePropertiesPageProps {
  params: Promise<{
    page: string;
  }>;
}

export default async function SalePropertiesPageWithPagination({ params }: SalePropertiesPageProps) {
  const { page } = await params;
  const pageNumber = parseInt(page) || 1;

  return (
    <>
      <Yad2ScraperWrapper />
      <section>
        <PropertyGrid listingType="sale" initialPage={pageNumber} />
      </section>
    </>
  );
}