# Domica - Rental Visualization Platform

## 🔴 CRITICAL: NOTION-LINEAR SYNC INSTRUCTIONS 🔴

**WHENEVER YOU ARE ASKED TO UPDATE NOTION OR LINEAR, YOU MUST SYNC BOTH:**

1. **IF UPDATING NOTION** → IMMEDIATELY UPDATE LINEAR WITH THE SAME CHANGES
2. **IF UPDATING LINEAR** → IMMEDIATELY UPDATE NOTION WITH THE SAME CHANGES

### SYNC REQUIREMENTS:
- **Projects**: Must exist in BOTH Notion AND Linear with matching:
  - Name/Title
  - Status (Not started → Planned, In progress → Started, etc.)
  - Priority (High, Normal, Low)
  - Due dates
  - Description/Content
- **Tasks/Issues**: Create corresponding items in both systems
- **Updates**: Any status change, priority change, or content update must be reflected in BOTH

### CURRENT PROJECTS TO SYNC:
- PoC of scraping (Status: In progress, Priority: High, Due: 2025-07-06)
- Internal QA & documentation (Status: Not started)
- Front-end (Status: Not started)
- Technologies research & prices (Status: In progress, Priority: High, Due: 2025-07-12)
- Back-end (Status: Not started)
- AI & integrations (Status: Not started)
- Basic technical architecture design (Status: Not started, Priority: High)

## Project Overview

A Next.js application to visualize rental listings scraped from Yad2 (Israeli real estate site). The app displays rental property details stored in Supabase with automatic fallback to demo data when scraping is unavailable.

## Tech Stack

- **Frontend**: Next.js (latest) with TypeScript
- **Styling**: Tailwind CSS (latest)
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Data Fetching**: TanStack Query
- **Scraping**: Firecrawl API (with mock data fallback)
- **Image Storage**: UploadThing
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

## Cleanup Guidelines

- If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task