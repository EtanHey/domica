# Domica - Rental Visualization Platform

This is a [Next.js](https://nextjs.org) project for visualizing rental listings scraped from Facebook Marketplace.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Frontend**: Next.js (latest) with TypeScript
- **Styling**: Tailwind CSS (latest)
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Data Fetching**: TanStack Query

## Project Structure

- `/src/app` - Next.js app directory
- `/src/components` - React components
- `/src/lib` - Utility functions and database configuration
- `/src/providers` - React context providers
- `/public` - Static assets
- `/scraper` - Facebook rental scraping scripts
- `/rental_analysis_output_*` - Analysis output files

## Analysis Tools

The project includes Python analysis scripts:

1. `rental_app_analysis.py` - Basic market analysis
2. `rental_app_insights.py` - Strategic insights generator
3. `rental_app_visualizations.py` - Visual dashboard creator
4. `run_all_analysis.py` - Main runner script

To run analysis:

```bash
python run_all_analysis.py
```

## Development

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
