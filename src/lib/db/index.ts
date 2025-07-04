import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// AI-DEV: Drizzle ORM client for type-safe database queries
// <scratchpad>Using postgres.js driver for connection pooling</scratchpad>

const connectionString = process.env.DATABASE_URL!;

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// Type exports for use throughout the app
export type Rental = typeof schema.rentals.$inferSelect;
export type NewRental = typeof schema.rentals.$inferInsert;
export type Landlord = typeof schema.landlords.$inferSelect;
export type NewLandlord = typeof schema.landlords.$inferInsert;
export type RentalImage = typeof schema.rentalImages.$inferSelect;
export type Amenity = typeof schema.amenities.$inferSelect;
export type PriceHistory = typeof schema.priceHistory.$inferSelect;