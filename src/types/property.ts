import { InferSelectModel } from 'drizzle-orm';
import {
  properties,
  propertyImages,
  propertyLocation,
  landlords,
  amenities,
  propertyAmenities,
  priceHistory,
  scrapeMetadata,
  duplicateReviews,
  propertyMergeHistory,
} from '@/lib/db/schema';

// Base types inferred from schema
export type Property = InferSelectModel<typeof properties>;
export type PropertyImage = InferSelectModel<typeof propertyImages>;
export type PropertyLocation = InferSelectModel<typeof propertyLocation>;
export type Landlord = InferSelectModel<typeof landlords>;
export type Amenity = InferSelectModel<typeof amenities>;
export type PropertyAmenity = InferSelectModel<typeof propertyAmenities>;
export type PriceHistory = InferSelectModel<typeof priceHistory>;
export type ScrapeMetadata = InferSelectModel<typeof scrapeMetadata>;
export type DuplicateReview = InferSelectModel<typeof duplicateReviews>;
export type PropertyMergeHistory = InferSelectModel<typeof propertyMergeHistory>;

// Types with relations
export type PropertyWithRelations = Property & {
  images?: PropertyImage[];
  location?: PropertyLocation | null;
  landlord?: Landlord | null;
  amenities?: PropertyAmenity | null;
  priceHistory?: PriceHistory[];
  scrapeMetadata?: ScrapeMetadata[];
};

// For backward compatibility during migration
export type Rental = Property;
export type RentalWithRelations = PropertyWithRelations;
