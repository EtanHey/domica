import { RentalGrid } from "@/components/rental-grid";
import { ScraperControls } from "@/components/scraper-controls";

// <scratchpad>Main landing page showing rental listings</scratchpad>
export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Domica
          </h1>
          <p className="text-muted-foreground text-lg">
            Find your perfect rental from Facebook Marketplace
          </p>
        </header>
        
        <ScraperControls />
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Available Rentals</h2>
          <RentalGrid />
        </section>
      </div>
    </main>
  );
}