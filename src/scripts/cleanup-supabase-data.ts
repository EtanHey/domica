import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupSupabaseData() {
  console.log('Starting Supabase data cleanup...\n');

  try {
    // 1. Get all rentals
    const { data: allRentals, error: fetchError } = await supabase
      .from('rentals')
      .select('*');

    if (fetchError) {
      console.error('Error fetching rentals:', fetchError);
      return;
    }

    console.log(`Found ${allRentals?.length || 0} total rentals\n`);

    let updatedCount = 0;
    let deletedCount = 0;

    // 2. Clean up each rental
    for (const rental of allRentals || []) {
      let needsUpdate = false;
      const updates: any = {};

      // Remove price from title using regex patterns
      const pricePatterns = [
        /\s*-\s*\d+\s*₪?\s*$/,  // Matches " - 5000 ₪" at end
        /\s*₪?\s*\d+\s*₪?\s*$/,  // Matches "5000₪" or "₪5000" at end
        /\s*\d+\s*ש"ח\s*$/,      // Matches "5000 ש"ח" at end
        /\s*\d{1,3}(,\d{3})*\s*₪?\s*$/, // Matches formatted numbers like "5,000"
      ];

      let cleanedTitle = rental.title;
      for (const pattern of pricePatterns) {
        cleanedTitle = cleanedTitle.replace(pattern, '').trim();
      }

      if (cleanedTitle !== rental.title) {
        updates.title = cleanedTitle;
        needsUpdate = true;
        console.log(`Cleaning title: "${rental.title}" -> "${cleanedTitle}"`);
      }

      // Ensure listing_type is set
      if (!rental.listing_type) {
        // Determine based on price
        const price = parseFloat(rental.price_per_month);
        updates.listing_type = price > 50000 ? 'sale' : 'rent';
        needsUpdate = true;
        console.log(`Setting listing_type for ${rental.id}: ${updates.listing_type} (price: ${price})`);
      }

      // Delete rentals without essential data
      if (!rental.title || rental.title.trim() === '' || !rental.price_per_month) {
        console.log(`Deleting rental ${rental.id} - missing essential data`);
        const { error: deleteError } = await supabase
          .from('rentals')
          .delete()
          .eq('id', rental.id);

        if (deleteError) {
          console.error(`Error deleting rental ${rental.id}:`, deleteError);
        } else {
          deletedCount++;
        }
        continue;
      }

      // Update if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('rentals')
          .update(updates)
          .eq('id', rental.id);

        if (updateError) {
          console.error(`Error updating rental ${rental.id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    // 3. Final summary
    console.log('\n=== Cleanup Summary ===');
    console.log(`Total rentals processed: ${allRentals?.length || 0}`);
    console.log(`Rentals updated: ${updatedCount}`);
    console.log(`Rentals deleted: ${deletedCount}`);

    // 4. Get final statistics
    const { data: finalStats, error: statsError } = await supabase
      .from('rentals')
      .select('listing_type');

    if (!statsError && finalStats) {
      const rentCount = finalStats.filter(r => r.listing_type === 'rent').length;
      const saleCount = finalStats.filter(r => r.listing_type === 'sale').length;
      
      console.log('\n=== Final Statistics ===');
      console.log(`Rentals: ${rentCount}`);
      console.log(`Sales: ${saleCount}`);
      console.log(`Total: ${finalStats.length}`);
    }

  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

cleanupSupabaseData().catch(console.error);