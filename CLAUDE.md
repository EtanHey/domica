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
- Format check: `npm run format:check`
- Format fix: `npm run format`

## ⚠️ CRITICAL: shadcn/ui Component Installation

**NEVER use `--yes` flag when installing shadcn components unless:**

1. Explicitly instructed by the user
2. You've verified that no customizations exist for that component

**Why:** The `--yes` flag will overwrite existing files without prompting, potentially destroying custom modifications to components.

**Safe approach:**

```bash
# Always use interactive mode (without --yes)
npx shadcn@latest add <component>

# If component exists, choose 'n' to skip overwriting
```

## Pre-Push Checklist

**ALWAYS run these commands before pushing changes:**

1. **Type Check**: `npm run type-check` - Ensures TypeScript types are correct
2. **Build**: `npm run build` - Verifies the project builds successfully
3. **Format Check**: `npm run format:check` - Checks code formatting

If any of these commands fail, fix the issues before pushing. This ensures:

- No TypeScript errors in production
- The app builds successfully
- Code follows consistent formatting

## Supabase Integration Notes

- Use Row Level Security (RLS) for data protection
- Create proper indexes for performance
- Set up realtime subscriptions for live updates
- **IMPORTANT**: When manipulating Supabase, always try to use the Supabase MCP tools first
  - If MCP tools fail with permission errors, provide SQL scripts for manual execution
  - The MCP tools available include: list_tables, execute_sql, apply_migration, etc.

### 🔴 CRITICAL: Supabase MCP Tool Usage 🔴

**ALWAYS use the correct project ID when using Supabase MCP tools:**

1. **First list organizations**: `mcp__domica-supabase__list_organizations` (no parameters)
2. **Then list projects**: `mcp__domica-supabase__list_projects` (no parameters)
3. **Use the correct project ID** from the list_projects response (NOT the one from the URL or environment variables)
   - Example: The project ID `kxynaapnrvjdwiucfdhz` is different from the URL subdomain `ngzzoxubmkmibuzhlqvt`

**Common MCP tool mistakes to avoid:**

- Using wrong parameter names (e.g., `project_id` vs `id`)
- Using the Supabase URL subdomain as the project ID
- Not checking the actual project ID from list_projects first
- Giving up after first permission error instead of checking project ID

**Correct workflow:**

```
1. list_organizations() → get org ID
2. list_projects() → get correct project ID
3. execute_sql(project_id=<correct_id>, query=...)
```

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
