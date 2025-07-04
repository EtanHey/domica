# Claude Scratchpad - Rental Visualization Project

## Current Context (Updated: 2025-01-04)
- Successfully flattened project structure - everything now lives in root directory
- Integrated UploadThing for image storage (credentials provided by user)
- Created API endpoint `/api/scraper` to trigger Python scripts from Next.js
- All Python scripts organized in `python_scripts/` directory
- Added ScraperControls component to UI for managing scraping operations
- App is running successfully on http://localhost:3000

## Project Structure
```
/domica (root)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── uploadthing/    # UploadThing API routes
│   │   │   └── scraper/        # Python scraper trigger endpoint
│   │   ├── page.tsx            # Main page with ScraperControls
│   │   └── layout.tsx
│   ├── components/
│   │   ├── rental-grid.tsx     # Main rental display component
│   │   ├── rental-card.tsx     # Individual rental card
│   │   ├── scraper-controls.tsx # UI for triggering scraper
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── db/                 # Drizzle ORM schemas
│   │   └── supabase.ts         # Supabase client
│   └── server/
│       └── uploadthing.ts      # UploadThing configuration
├── python_scripts/             # All Python scripts
│   ├── facebook_rental_scraper.py
│   ├── uploadthing_integration.py
│   └── rental_app_*.py         # Analysis scripts
├── public/                     # Static assets
└── test-images.json           # Unsplash URLs for testing
```

## Database Schema (Supabase)
Created comprehensive schema with:
1. `rentals` - Main rental properties table
2. `rental_images` - Multiple images per rental (now using UploadThing URLs)
3. `landlords` - Property owner information
4. `amenities` - Available amenities
5. `rental_amenities` - Many-to-many relationship
6. `price_history` - Track price changes over time
7. `scrape_metadata` - Track when/where data was scraped

## Technical Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM for type-safe queries
- **Data Fetching**: TanStack Query
- **Image Storage**: UploadThing
- **Python Integration**: Child process execution via API endpoint

## Recent Changes
1. **Flattened Structure**: Moved all `rental-viz/` contents to root as requested
2. **Python Organization**: All Python scripts now in `python_scripts/`
3. **API Integration**: Created `/api/scraper` endpoint to trigger Python scripts
4. **Command Line Support**: Updated Python scripts to accept CLI arguments and output JSON
5. **UI Controls**: Added ScraperControls component for easy scraping management
6. **Added UI Components**: Installed card, input, label, toast from shadcn/ui
7. **Added Toaster**: Integrated toast notifications in layout

## UploadThing Integration
- Configured server-side upload with UTApi
- Created test scripts for uploading images
- Python integration ready in `uploadthing_integration.py`
- Credentials stored in environment variables
- User provided Unsplash URLs in test-images.json

## API Endpoint Usage
POST `/api/scraper` accepts:
```json
{
  "action": "scrape|upload-images|analyze",
  "config": {
    "searchQuery": "apartment for rent",
    "location": "San Francisco",
    "rentalId": "uuid-here"
  }
}
```

## Current Issues/Notes
- Image 404 errors - Unsplash URLs need proper format conversion (photo page vs direct image URL)
- Mock data currently returned by scraper (educational implementation)
- Need to update existing rental images in database to use UploadThing URLs

## TODO
- [x] Fix missing UI components (card, input, label, toast)
- [ ] Convert Unsplash photo page URLs to direct image URLs
- [ ] Test UploadThing integration with actual image uploads
- [ ] Update database seed data to use UploadThing URLs
- [ ] Implement real scraping logic (respecting Facebook ToS)
- [ ] Add filtering and search functionality to rental grid
- [ ] Implement map view for rentals
- [ ] Add real-time updates using Supabase subscriptions
- [ ] Create proper error handling and logging
- [ ] Add loading states and progress indicators
- [ ] Implement pagination for large datasets

## Important Reminders
- Always check browser tools after client-side changes
- Commit often with minimal changes
- Use Context7 for documentation lookups
- Mobile-first design approach
- Respect Facebook's Terms of Service for scraping
- User is running the dev server - don't start new servers