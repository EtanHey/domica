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

export const rentals = pgTable(
  'rentals',
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
    masterRentalId: uuid('master_rental_id'),
    sourceplatform: varchar('source_platform', { length: 50 }),
    sourceId: varchar('source_id', { length: 255 }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    locationIdx: index('idx_rentals_location').on(table.latitude, table.longitude),
    priceIdx: index('idx_rentals_price').on(table.pricePerMonth),
    bedroomsIdx: index('idx_rentals_bedrooms').on(table.bedrooms),
    activeIdx: index('idx_rentals_is_active').on(table.isActive),
  })
);

export const rentalImages = pgTable(
  'rental_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rentalId: uuid('rental_id')
      .notNull()
      .references(() => rentals.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    imageOrder: integer('image_order').default(0),
    isPrimary: boolean('is_primary').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    rentalIdx: index('idx_rental_images_rental').on(table.rentalId),
  })
);

export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  category: varchar('category', { length: 50 }),
  iconName: varchar('icon_name', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const rentalAmenities = pgTable(
  'rental_amenities',
  {
    rentalId: uuid('rental_id')
      .notNull()
      .references(() => rentals.id, { onDelete: 'cascade' }),
    amenityId: uuid('amenity_id')
      .notNull()
      .references(() => amenities.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.rentalId, table.amenityId] }),
  })
);

export const priceHistory = pgTable(
  'price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rentalId: uuid('rental_id')
      .notNull()
      .references(() => rentals.id, { onDelete: 'cascade' }),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
    priceChangeAmount: decimal('price_change_amount', { precision: 10, scale: 2 }),
  },
  (table) => ({
    rentalIdx: index('idx_price_history_rental').on(table.rentalId),
  })
);

export const scrapeMetadata = pgTable(
  'scrape_metadata',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rentalId: uuid('rental_id')
      .notNull()
      .references(() => rentals.id, { onDelete: 'cascade' }),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow(),
    sourceUrl: text('source_url'),
    scraperVersion: varchar('scraper_version', { length: 20 }),
    rawData: jsonb('raw_data'),
  },
  (table) => ({
    rentalIdx: index('idx_scrape_metadata_rental').on(table.rentalId),
  })
);

// Relations
export const landlordsRelations = relations(landlords, ({ many }) => ({
  rentals: many(rentals),
}));

export const rentalsRelations = relations(rentals, ({ one, many }) => ({
  landlord: one(landlords, {
    fields: [rentals.landlordId],
    references: [landlords.id],
  }),
  images: many(rentalImages),
  amenities: many(rentalAmenities),
  priceHistory: many(priceHistory),
  scrapeMetadata: many(scrapeMetadata),
}));

export const rentalImagesRelations = relations(rentalImages, ({ one }) => ({
  rental: one(rentals, {
    fields: [rentalImages.rentalId],
    references: [rentals.id],
  }),
}));

export const amenitiesRelations = relations(amenities, ({ many }) => ({
  rentals: many(rentalAmenities),
}));

export const rentalAmenitiesRelations = relations(rentalAmenities, ({ one }) => ({
  rental: one(rentals, {
    fields: [rentalAmenities.rentalId],
    references: [rentals.id],
  }),
  amenity: one(amenities, {
    fields: [rentalAmenities.amenityId],
    references: [amenities.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  rental: one(rentals, {
    fields: [priceHistory.rentalId],
    references: [rentals.id],
  }),
}));

export const scrapeMetadataRelations = relations(scrapeMetadata, ({ one }) => ({
  rental: one(rentals, {
    fields: [scrapeMetadata.rentalId],
    references: [rentals.id],
  }),
}));
