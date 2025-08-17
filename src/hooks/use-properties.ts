import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/lib/db';
import { QueryKeys, MutationKeys } from '@/lib/query-keys';
import { transformProperty } from '@/lib/db/utils';

interface PropertyFilters {
  city?: string;
  minRooms?: number;
  maxPrice?: number;
  propertyType?: string;
  page?: number;
  limit?: number;
  listingType?: 'rent' | 'sale';
  duplicateStatus?: 'review' | 'unique' | 'duplicate';
  sourcePlatform?: 'yad2' | 'facebook';
}

// Fetch all properties with optional filters and pagination
export function useProperties(filters?: PropertyFilters) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return useQuery({
    queryKey: filters ? QueryKeys.properties.list(filters) : QueryKeys.properties.all,
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select(
          `
          *,
          property_images(
            image_url,
            is_primary
          ),
          landlord:landlords(
            name,
            profile_image_url
          ),
          property_location(
            address,
            city,
            neighborhood,
            formatted_address
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
      if (filters?.listingType) {
        query = query.eq('listing_type', filters.listingType);
      }
      if (filters?.duplicateStatus) {
        query = query.eq('duplicate_status', filters.duplicateStatus);
      }
      if (filters?.sourcePlatform) {
        query = query.eq('source_platform', filters.sourcePlatform);
      }

      // Exclude confirmed duplicates unless specifically requested
      if (!filters?.duplicateStatus || filters.duplicateStatus !== 'duplicate') {
        query = query.neq('duplicate_status', 'duplicate');
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching properties:', error);
        throw error;
      }

      // Transform snake_case fields to camelCase
      const transformedData = data?.map(transformProperty) || [];

      return {
        properties: transformedData,
        totalCount: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });
}

// Fetch a single property by ID
export function useProperty(id: string) {
  return useQuery({
    queryKey: QueryKeys.properties.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
          *,
          property_images(
            image_url,
            is_primary,
            caption
          ),
          landlord:landlords(*),
          property_amenities(*),
          property_location(
            address,
            city,
            neighborhood,
            formatted_address
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching property:', error);
        throw error;
      }

      // Transform snake_case fields to camelCase
      return transformProperty(data);
    },
    enabled: !!id,
  });
}

// Create a new property
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MutationKeys.createProperty,
    mutationFn: async (property: Partial<Property>) => {
      const { data, error } = await supabase.from('properties').insert(property).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all property queries to refetch the data
      queryClient.invalidateQueries({ queryKey: QueryKeys.properties.all });
    },
  });
}

// Update a property
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MutationKeys.updateProperty,
    mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate specific property and all properties list
      queryClient.invalidateQueries({ queryKey: QueryKeys.properties.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: QueryKeys.properties.all });
    },
  });
}

// Delete a property
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: MutationKeys.deleteProperty,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.properties.all });
    },
  });
}
