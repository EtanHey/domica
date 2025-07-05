// Extended rental type with all fields from database
export interface RentalWithRelations {
  id: string;
  facebook_id: string;
  landlord_id?: string | null;
  title: string;
  description?: string | null;
  price_per_month: string;
  currency?: string | null;
  location_text?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  bedrooms?: number | null;
  bathrooms?: string | null;
  square_feet?: number | null;
  property_type?: string | null;
  available_date?: string | null;
  is_active?: boolean | null;
  listing_type?: string | null;
  duplicate_status?: string | null;
  duplicate_score?: string | null;
  master_rental_id?: string | null;
  source_platform?: string | null;
  source_id?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  rental_images?: Array<{
    image_url: string;
    is_primary?: boolean | null;
  }> | null;
  landlord?: {
    name: string;
    profile_image_url?: string | null;
  } | null;
}
