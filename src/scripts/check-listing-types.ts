import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkListingTypes() {
  console.log('Checking listing types in database...\n');

  // Get summary by listing type
  const { data: rentals, error } = await supabase
    .from('rentals')
    .select('listing_type, price_per_month, title')
    .order('price_per_month', { ascending: false });

  if (error) {
    console.error('Error fetching rentals:', error);
    return;
  }

  // Group by listing type
  const rentGroup = rentals?.filter(r => r.listing_type === 'rent') || [];
  const saleGroup = rentals?.filter(r => r.listing_type === 'sale') || [];
  const nullGroup = rentals?.filter(r => !r.listing_type) || [];

  console.log('Summary:');
  console.log(`- Rentals: ${rentGroup.length}`);
  console.log(`- Sales: ${saleGroup.length}`);
  console.log(`- Unclassified: ${nullGroup.length}`);
  console.log(`- Total: ${rentals?.length || 0}`);

  if (rentGroup.length > 0) {
    const avgRent = rentGroup.reduce((sum, r) => sum + parseFloat(r.price_per_month), 0) / rentGroup.length;
    const maxRent = Math.max(...rentGroup.map(r => parseFloat(r.price_per_month)));
    const minRent = Math.min(...rentGroup.map(r => parseFloat(r.price_per_month)));
    
    console.log('\nRentals:');
    console.log(`  Average: ₪${avgRent.toFixed(0)}/month`);
    console.log(`  Range: ₪${minRent} - ₪${maxRent}`);
  }

  if (saleGroup.length > 0) {
    const avgSale = saleGroup.reduce((sum, r) => sum + parseFloat(r.price_per_month), 0) / saleGroup.length;
    const maxSale = Math.max(...saleGroup.map(r => parseFloat(r.price_per_month)));
    const minSale = Math.min(...saleGroup.map(r => parseFloat(r.price_per_month)));
    
    console.log('\nSales:');
    console.log(`  Average: ₪${avgSale.toFixed(0)}`);
    console.log(`  Range: ₪${minSale} - ₪${maxSale}`);
    
    // Show some high-priced listings
    console.log('\n  High-priced listings (likely sales):');
    saleGroup.slice(0, 5).forEach(r => {
      console.log(`    - ${r.title}: ₪${parseFloat(r.price_per_month).toLocaleString()}`);
    });
  }

  // Check for potential misclassifications
  const suspiciousRentals = rentGroup.filter(r => parseFloat(r.price_per_month) > 50000);
  const suspiciousSales = saleGroup.filter(r => parseFloat(r.price_per_month) < 50000);

  if (suspiciousRentals.length > 0) {
    console.log(`\n⚠️  Found ${suspiciousRentals.length} rentals with price > ₪50,000 (might be sales)`);
  }

  if (suspiciousSales.length > 0) {
    console.log(`\n⚠️  Found ${suspiciousSales.length} sales with price < ₪50,000 (might be rentals)`);
  }
}

checkListingTypes().catch(console.error);