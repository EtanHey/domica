'use client';

import { useState } from 'react';
import { RentalCard } from './rental-card';
import { useRentals } from '@/hooks/use-rentals';
import type { RentalWithRelations } from '@/types/rental';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// AI-DEV: Main grid component for displaying rental listings
// <scratchpad>Uses custom hook with TanStack Query for data fetching</scratchpad>

interface RentalGridProps {
  listingType?: 'all' | 'rent' | 'sale';
}

export function RentalGrid({ listingType = 'all' }: RentalGridProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useRentals({ page, limit: 20 });

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

  const rentals = data?.rentals || [];
  const totalPages = data?.totalPages || 1;

  if (!data || rentals.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-lg">אין נתונים להצגה</p>
      </div>
    );
  }

  // Filter rentals based on listing type and exclude duplicates
  const activeRentals = (rentals as RentalWithRelations[]).filter((rental) => {
    // Always exclude duplicates
    if (rental.duplicate_status === 'duplicate') return false;

    // Filter by listing type
    if (listingType === 'all') return true;
    return rental.listing_type === listingType;
  });

  return (
    <div className="space-y-4">
      <p dir="rtl" className="text-muted-foreground">
        מציג {activeRentals.length} מתוך {data.totalCount}{' '}
        {listingType === 'rent'
          ? 'דירות להשכרה'
          : listingType === 'sale'
            ? 'דירות למכירה'
            : 'נכסים'}
        {page > 1 && ` (עמוד ${page})`}
      </p>

      <div dir="rtl" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activeRentals.map((rental) => (
          <RentalCard
            key={rental.id}
            rental={{
              ...rental,
              price_per_month: parseFloat(rental.price_per_month),
              location_text: rental.location_text || '',
              bathrooms: rental.bathrooms ? parseFloat(rental.bathrooms) : undefined,
              currency: rental.currency || undefined,
              bedrooms: rental.bedrooms ?? undefined,
              rental_images:
                rental.rental_images?.map((img) => ({
                  ...img,
                  is_primary: img.is_primary ?? undefined,
                })) ?? undefined,
            }}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
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
                          setPage(pageNum);
                        }}
                        isActive={pageNum === page}
                        className="cursor-pointer"
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
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
