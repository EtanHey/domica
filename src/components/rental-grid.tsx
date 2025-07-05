'use client';

import { RentalCard } from './rental-card';
import { useRentals } from '@/hooks/use-rentals';
import type { RentalWithRelations } from '@/types/rental';

// AI-DEV: Main grid component for displaying rental listings
// <scratchpad>Uses custom hook with TanStack Query for data fetching</scratchpad>

interface RentalGridProps {
  listingType?: 'all' | 'rent' | 'sale';
}

export function RentalGrid({ listingType = 'all' }: RentalGridProps) {
  const { data: rentals, isLoading, error } = useRentals();

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

  if (!rentals || rentals.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-lg">אין נתונים להצגה</p>
      </div>
    );
  }

  // Filter rentals based on listing type and exclude duplicates
  const activeRentals = (rentals as RentalWithRelations[]).filter(rental => {
    // Always exclude duplicates
    if (rental.duplicate_status === 'duplicate') return false;
    
    // Filter by listing type
    if (listingType === 'all') return true;
    return rental.listing_type === listingType;
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground">
          מציג {activeRentals.length} {listingType === 'rent' ? 'דירות להשכרה' : listingType === 'sale' ? 'דירות למכירה' : 'נכסים'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {activeRentals.map((rental) => (
          <RentalCard 
            key={rental.id} 
            rental={{
              ...rental,
              price_per_month: parseFloat(rental.price_per_month),
              location_text: rental.location_text || '',
              bathrooms: rental.bathrooms ? parseFloat(rental.bathrooms) : undefined,
              currency: rental.currency || undefined
            }} 
          />
        ))}
      </div>
    </>
  );
}
