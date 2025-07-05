import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateListingTypes() {
  console.log('Updating listing types based on price...');

  // Fetch all rentals without listing_type
  const { data: rentals, error: fetchError } = await supabase
    .from('rentals')
    .select('id, price_per_month')
    .is('listing_type', null);

  if (fetchError) {
    console.error('Error fetching rentals:', fetchError);
    return;
  }

  console.log(`Found ${rentals?.length || 0} rentals without listing_type`);

  if (!rentals || rentals.length === 0) {
    console.log('No rentals to update');
    return;
  }

  // Update each rental
  for (const rental of rentals) {
    const listingType = parseFloat(rental.price_per_month) > 50000 ? 'sale' : 'rent';
    
    const { error: updateError } = await supabase
      .from('rentals')
      .update({ listing_type: listingType })
      .eq('id', rental.id);

    if (updateError) {
      console.error(`Error updating rental ${rental.id}:`, updateError);
    } else {
      console.log(`Updated rental ${rental.id} to ${listingType} (price: ₪${rental.price_per_month})`);
    }
  }

  // Get summary
  const { data: summary, error: summaryError } = await supabase
    .from('rentals')
    .select('listing_type');

  if (!summaryError && summary) {
    const rentCount = summary.filter(r => r.listing_type === 'rent').length;
    const saleCount = summary.filter(r => r.listing_type === 'sale').length;
    const nullCount = summary.filter(r => !r.listing_type).length;

    console.log('\nSummary:');
    console.log(`- Rentals: ${rentCount}`);
    console.log(`- Sales: ${saleCount}`);
    console.log(`- Unclassified: ${nullCount}`);
  }
}

updateListingTypes().catch(console.error);