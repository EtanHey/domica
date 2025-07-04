# Claude Scratchpad - Domica Rental Visualization

## Extended Thinking & Memory Retention

### Project Architecture
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS v4
- **Components**: shadcn/ui for consistent, accessible UI components
- **Database**: Supabase (PostgreSQL) for rental data storage
- **ORM**: Drizzle ORM for type-safe database queries
- **Data Fetching**: TanStack Query for efficient data fetching and caching

### Database Schema Design (Facebook Marketplace Rental Scraping)

#### Core Tables:
1. **rentals** - Main rental properties
   - id (uuid, primary key)
   - facebook_id (unique identifier from FB)
   - title
   - description
   - price_per_month
   - currency
   - location_text
   - latitude/longitude
   - bedrooms
   - bathrooms
   - square_feet
   - property_type (apartment, house, condo, etc.)
   - available_date
   - created_at
   - updated_at
   - is_active

2. **rental_images**
   - id
   - rental_id (foreign key)
   - image_url
   - image_order
   - is_primary

3. **landlords**
   - id
   - facebook_profile_id
   - name
   - profile_image_url
   - contact_method
   - phone_number
   - response_rate
   - member_since

4. **amenities**
   - id
   - name (parking, laundry, pet-friendly, etc.)
   - category
   - icon_name

5. **rental_amenities** (junction table)
   - rental_id
   - amenity_id

6. **price_history**
   - id
   - rental_id
   - price
   - recorded_at
   - price_change_amount

7. **scrape_metadata**
   - id
   - rental_id
   - scraped_at
   - source_url
   - scraper_version
   - raw_data (jsonb)

### Key Features to Implement:
- <scratchpad>Rental grid/list view with filtering</scratchpad>
- <scratchpad>Individual rental detail pages</scratchpad>
- <scratchpad>Price history visualization</scratchpad>
- <scratchpad>Map view integration</scratchpad>
- <scratchpad>Search and filter functionality</scratchpad>
- <scratchpad>Real-time updates via Supabase subscriptions</scratchpad>

### AI-DEV Notes:
- AI-DEV: Use Drizzle ORM schema definitions in `/src/lib/db/schema.ts`
- AI-DEV: TanStack Query hooks should be in `/src/hooks/` directory
- AI-DEV: Centralize Supabase client configuration in `/src/lib/supabase.ts`
- AI-DEV: Use server components where possible for better performance
- AI-DEV: Implement RLS policies for all tables to secure data access

### Technical Decisions:
- Using Tailwind v4 with CSS variables for theming
- shadcn/ui components manually configured due to Tailwind v4 compatibility
- Component structure: centralized, reusable components in `/src/components`
- Database naming convention: snake_case for tables and columns