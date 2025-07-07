import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// AI-DEV: This schema mirrors the Supabase tables created in migrations
// <scratchpad>All tables use UUID primary keys and include proper indexes</scratchpad>

export const landlords = pgTable('landlords', {
  id: uuid('id').primaryKey().defaultRandom(),
  facebookProfileId: varchar('facebook_profile_id', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  profileImageUrl: text('profile_image_url'),
  contactMethod: varchar('contact_method', { length: 50 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  responseRate: integer('response_rate'),
  memberSince: date('member_since'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const properties = pgTable(
  'properties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facebookId: varchar('facebook_id', { length: 255 }).unique().notNull(),
    landlordId: uuid('landlord_id').references(() => landlords.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    pricePerMonth: decimal('price_per_month', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    locationText: varchar('location_text', { length: 500 }),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    bedrooms: integer('bedrooms'),
    bathrooms: decimal('bathrooms', { precision: 3, scale: 1 }),
    squareFeet: integer('square_feet'),
    propertyType: varchar('property_type', { length: 50 }),
    availableDate: date('available_date'),
    isActive: boolean('is_active').default(true),
    // New fields for duplicate detection and listing type
    listingType: varchar('listing_type', { length: 10 }).default('rent'),
    duplicateStatus: varchar('duplicate_status', { length: 20 }).default('unique'),
    duplicateScore: decimal('duplicate_score', { precision: 5, scale: 2 }),
    masterPropertyId: uuid('master_property_id'),
    sourcePlatform: varchar('source_platform', { length: 50 }),
    sourceId: varchar('source_id', { length: 255 }),
    sourceUrl: text('source_url'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    locationIdx: index('idx_properties_location').on(table.latitude, table.longitude),
    priceIdx: index('idx_properties_price').on(table.pricePerMonth),
    bedroomsIdx: index('idx_properties_bedrooms').on(table.bedrooms),
    activeIdx: index('idx_properties_is_active').on(table.isActive),
  })
);

export const propertyImages = pgTable(
  'property_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    imageOrder: integer('image_order').default(0),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    propertyIdx: index('idx_property_images_property').on(table.propertyId),
  })
);

export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  category: varchar('category', { length: 50 }),
  iconName: varchar('icon_name', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const propertyAmenities = pgTable(
  'property_amenities',
  {
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.propertyId, table.amenityId] }),
  })
);

export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
    priceChangeAmount: decimal('price_change_amount', { precision: 10, scale: 2 }),
  },
  (table) => ({
    propertyIdx: index('idx_price_history_property').on(table.propertyId),
  })
);

export const scrapeMetadata = pgTable(
  'scrape_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow(),
    sourceUrl: text('source_url'),
    scraperVersion: varchar('scraper_version', { length: 20 }),
    rawData: jsonb('raw_data'),
  },
  (table) => ({
    propertyIdx: index('idx_scrape_metadata_property').on(table.propertyId),
  })
);

// Relations
export const landlordsRelations = relations(landlords, ({ many }) => ({
  properties: many(properties),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  landlord: one(landlords, {
    fields: [properties.landlordId],
    references: [landlords.id],
  }),
  images: many(propertyImages),
  amenities: many(propertyAmenities),
  priceHistory: many(priceHistory),
  scrapeMetadata: many(scrapeMetadata),
}));

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(properties, {
    fields: [propertyImages.propertyId],
    references: [properties.id],
  }),
}));

export const amenitiesRelations = relations(amenities, ({ many }) => ({
  properties: many(propertyAmenities),
}));

export const propertyAmenitiesRelations = relations(propertyAmenities, ({ one }) => ({
  property: one(properties, {
    fields: [propertyAmenities.propertyId],
    references: [properties.id],
  }),
  amenity: one(amenities, {
    fields: [propertyAmenities.amenityId],
    references: [amenities.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  property: one(properties, {
    fields: [priceHistory.propertyId],
    references: [properties.id],
  }),
}));

export const scrapeMetadataRelations = relations(scrapeMetadata, ({ one }) => ({
  property: one(properties, {
    fields: [scrapeMetadata.propertyId],
    references: [properties.id],
  }),
}));

export const duplicateReviews = pgTable('duplicate_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyAId: uuid('property_a_id').references(() => properties.id, { onDelete: 'cascade' }),
  propertyBId: uuid('property_b_id').references(() => properties.id, { onDelete: 'cascade' }),
  rentalData: jsonb('rental_data'),
  matchedPropertyId: uuid('matched_property_id').references(() => properties.id, {
    onDelete: 'set null',
  }),
  score: decimal('score', { precision: 5, scale: 2 }),
  scoreBreakdown: jsonb('score_breakdown'),
  status: text('status').default('pending'),
  reviewedBy: text('reviewed_by'),
  decision: text('decision'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
});

export const propertyMergeHistory = pgTable('property_merge_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  masterPropertyId: uuid('master_property_id').references(() => properties.id, {
    onDelete: 'cascade',
  }),
  mergedPropertyId: uuid('merged_property_id'),
  mergedFields: jsonb('merged_fields'),
  previousValues: jsonb('previous_values'),
  mergeReason: text('merge_reason'),
  mergedAt: timestamp('merged_at', { withTimezone: true }).defaultNow(),
});

// Relations for new tables
export const duplicateReviewsRelations = relations(duplicateReviews, ({ one }) => ({
  propertyA: one(properties, {
    fields: [duplicateReviews.propertyAId],
    references: [properties.id],
  }),
  propertyB: one(properties, {
    fields: [duplicateReviews.propertyBId],
    references: [properties.id],
  }),
  matchedProperty: one(properties, {
    fields: [duplicateReviews.matchedPropertyId],
    references: [properties.id],
  }),
}));

export const propertyMergeHistoryRelations = relations(propertyMergeHistory, ({ one }) => ({
  masterProperty: one(properties, {
    fields: [propertyMergeHistory.masterPropertyId],
    references: [properties.id],
  }),
}));
