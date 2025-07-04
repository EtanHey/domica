'use client'

import { useQuery } from '@tanstack/react-query'
import { RentalCard } from './rental-card'
import { supabase } from '@/lib/supabase'
import { Rental } from '@/lib/db'

// AI-DEV: Main grid component for displaying rental listings
// <scratchpad>Uses TanStack Query for data fetching with Supabase</scratchpad>

async function fetchRentals(): Promise<Rental[]> {
  const { data, error } = await supabase
    .from('rentals')
    .select(`
      *,
      rental_images(
        image_url,
        is_primary
      ),
      landlord:landlords(
        name,
        profile_image_url
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching rentals:', error)
    throw error
  }

  return data || []
}

export function RentalGrid() {
  const { data: rentals, isLoading, error } = useQuery({
    queryKey: ['rentals'],
    queryFn: fetchRentals,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-96 bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive text-lg">
          Error loading rentals. Please try again later.
        </p>
      </div>
    )
  }

  if (!rentals || rentals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No rentals available at the moment.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {rentals.map((rental) => (
        <RentalCard key={rental.id} rental={rental} />
      ))}
    </div>
  )
}