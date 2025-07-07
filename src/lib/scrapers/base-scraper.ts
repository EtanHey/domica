export interface ScrapedListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  city: string;
  neighborhood?: string;
  rooms: number;
  floor: number | null;
  size_sqm: number | null;
  description: string;
  property_type: string;
  image_urls: string[];
  amenities: string[];
  contact_name?: string;
  phone_number?: string;
  listing_url: string;
  listing_type: 'rent' | 'sale';
  source_platform: string;
}