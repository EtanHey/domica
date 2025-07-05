import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Rental } from '@/lib/db';
import { QueryKeys, MutationKeys } from '@/lib/query-keys';

interface RentalFilters {
  city?: string;
  minRooms?: number;
  maxPrice?: number;
  propertyType?: string;
  page?: number;
  limit?: number;
}

// Fetch all rentals with optional filters and pagination
export function useRentals(filters?: RentalFilters) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: filters ? QueryKeys.rentals.list(filters) : QueryKeys.rentals.all,
    queryFn: async () => {
      let query = supabase
        .from('rentals')
        .select(
          `
          *,
          rental_images(
            image_url,
            is_primary
          ),
          landlord:landlords(
            name,
            profile_image_url
          )
        `,
          { count: 'exact' }
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters if provided
      if (filters?.city) {
        query = query.eq('city', filters.city);
      }
      if (filters?.minRooms) {
        query = query.gte('num_rooms', filters.minRooms);
      }
      if (filters?.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters?.propertyType) {
        query = query.eq('property_type', filters.propertyType);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching rentals:', error);
        throw error;
      }

      return {
        rentals: data || [],
        totalCount: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    },
  });
}

// Fetch a single rental by ID
export function useRental(id: string) {
  return useQuery({
    queryKey: QueryKeys.rentals.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rentals')
        .select(
          `
          *,
          rental_images(
            image_url,
            is_primary,
            caption
          ),
          landlord:landlords(*),
          rental_amenities(
            amenity:amenities(*)
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching rental:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
  });
}

// Create a new rental
export function useCreateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MutationKeys.createRental,
    mutationFn: async (rental: Partial<Rental>) => {
      const { data, error } = await supabase.from('rentals').insert(rental).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all rental queries to refetch the data
      queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.all });
    },
  });
}

// Update a rental
export function useUpdateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MutationKeys.updateRental,
    mutationFn: async ({ id, ...updates }: Partial<Rental> & { id: string }) => {
      const { data, error } = await supabase
        .from('rentals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate specific rental and all rentals list
      queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.all });
    },
  });
}

// Delete a rental
export function useDeleteRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MutationKeys.deleteRental,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rentals').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.rentals.all });
    },
  });
}
