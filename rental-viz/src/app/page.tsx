import { RentalGrid } from "@/components/rental-grid";

// <scratchpad>Main landing page showing rental listings</scratchpad>
export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Domica
          </h1>
          <p className="text-muted-foreground text-lg">
            Find your perfect rental from Facebook Marketplace
          </p>
        </header>
        
        <RentalGrid />
      </div>
    </main>
  );
}