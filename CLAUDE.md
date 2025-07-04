# Domica - Rental Visualization Platform

## Project Overview
A Next.js application to visualize rental listings scraped from Facebook Marketplace. The app displays rental property details stored in Supabase.

## Tech Stack
- **Frontend**: Next.js (latest) with TypeScript
- **Styling**: Tailwind CSS (latest)
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Data Fetching**: TanStack Query
- **Version Control**: GitHub (private repository)

## Key Requirements
1. Display rental property details from Supabase
2. Use Drizzle ORM for database operations
3. Use TanStack Query for data fetching and caching
4. TypeScript for type safety
5. Creative database schema for Facebook rental scraping
6. Mobile-first responsive design

## Database Schema Design
### Tables to create:
- `rentals` - Main rental properties table
- `rental_images` - Multiple images per rental
- `landlords` - Property owner information
- `amenities` - Available amenities
- `rental_amenities` - Many-to-many relationship
- `price_history` - Track price changes over time
- `scrape_metadata` - Track when/where data was scraped

## Important Commands
- Run dev server: `npm run dev`
- Build: `npm run build`
- Type check: `npm run type-check`
- Lint: `npm run lint`

## Supabase Integration Notes
- Use Row Level Security (RLS) for data protection
- Create proper indexes for performance
- Set up realtime subscriptions for live updates

## Scratchpad/AI-DEV Comments
Use `// <scratchpad>` or `// AI-DEV:` for important implementation notes that other agents might need.

## Development Notes
- Focus on rental listing visualization
- Optimize for performance with large datasets
- Implement filtering and search capabilities
- Consider implementing map view for rentals
- Commit often to keep changes minimal and incremental
- Use Context7 MCP tool for accessing library documentation
- Check browser tools (takeScreenshot) after making client-side changes