'use client';

import { RentalCard } from './rental-card';
import { useRentals } from '@/hooks/use-rentals';

// AI-DEV: Main grid component for displaying rental listings
// <scratchpad>Uses custom hook with TanStack Query for data fetching</scratchpad>

interface RentalGridProps {
  messages: {
    loading: string;
    noData: string;
    networkError: string;
  };
}

export function RentalGrid({ messages }: RentalGridProps) {
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
        <p className="text-destructive text-lg">{messages.networkError}</p>
      </div>
    );
  }

  if (!rentals || rentals.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-lg">{messages.noData}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rentals.map((rental) => (
        <RentalCard key={rental.id} rental={rental} />
      ))}
    </div>
  );
}
