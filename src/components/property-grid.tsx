'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PropertyCardWithCarousel } from './property-card-with-carousel';
import { useProperties } from '@/hooks/use-properties';
import type { PropertyWithRelations } from '@/types/property';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// AI-DEV: Main grid component for displaying property listings
// <scratchpad>Uses custom hook with TanStack Query for data fetching</scratchpad>

import { ListingType, ListingTypeValue } from '@/types/listing';

interface PropertyGridProps {
  listingType?: ListingTypeValue;
  initialPage?: number;
  sourcePlatform?: 'yad2' | 'facebook';
}

export function PropertyGrid({
  listingType = ListingType.All,
  initialPage = 1,
  sourcePlatform,
}: PropertyGridProps) {
  const [page, setPage] = useState(initialPage);
  const router = useRouter();
  const pathname = usePathname();

  // Update page when initialPage changes
  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

  // Function to navigate to a new page
  const handlePageChange = (newPage: number) => {
    setPage(newPage);

    // Build the new URL based on current section, listing type, and source platform
    let newPath = '';
    if (pathname.includes('/scraping-poc')) {
      const base = `/scraping-poc${sourcePlatform ? `/${sourcePlatform}` : ''}`;
      newPath =
        listingType === ListingType.All
          ? `${base}/${newPage}`
          : `${base}/${listingType}/${newPage}`;
    } else {
      // Original routing for other sections
      newPath =
        listingType === ListingType.All ? `/${newPage}` : `/${listingType}/${newPage}`;
    }

    // Navigate without auto-scroll, then smooth scroll manually
    router.push(newPath, { scroll: false });

    // Delay the smooth scroll slightly to ensure navigation completes
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  // Build filters based on listing type and source platform
  const filters = {
    page,
    limit: 20,
    ...(listingType === ListingType.Rent && { listingType: 'rent' as const }),
    ...(listingType === ListingType.Sale && { listingType: 'sale' as const }),
    ...(listingType === ListingType.Review && { duplicateStatus: 'review' as const }),
    ...(sourcePlatform && { sourcePlatform }),
  };

  const { data, isLoading, error } = useProperties(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-muted h-96 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive text-lg">שגיאת רשת</p>
      </div>
    );
  }

  const properties = data?.properties || [];
  const totalPages = data?.totalPages || 1;

  if (!data || properties.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-lg">אין נתונים להצגה</p>
      </div>
    );
  }

  // Data is already filtered server-side, no need for client-side filtering
  const activeProperties = properties as PropertyWithRelations[];

  return (
    <div className="space-y-4">
      <p dir="rtl" className="text-muted-foreground">
        מציג {activeProperties.length} מתוך {data.totalCount}{' '}
        {listingType === ListingType.Rent
          ? 'דירות להשכרה'
          : listingType === ListingType.Sale
            ? 'דירות למכירה'
            : listingType === ListingType.Review
              ? 'נכסים לבדיקה'
              : 'נכסים'}
        {page > 1 && ` (עמוד ${page})`}
      </p>

      <div
        dir="rtl"
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {activeProperties.map((property) => (
          <PropertyCardWithCarousel key={property.id} property={property} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center" dir="rtl">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) handlePageChange(page - 1);
                  }}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (pageNum !== page) {
                            handlePageChange(pageNum);
                          }
                        }}
                        isActive={pageNum === page}
                        className={pageNum === page ? 'pointer-events-none' : 'cursor-pointer'}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (
                  (pageNum === page - 2 && page > 3) ||
                  (pageNum === page + 2 && page < totalPages - 2)
                ) {
                  return <PaginationEllipsis key={pageNum} />;
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) handlePageChange(page + 1);
                  }}
                  className={
                    page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
