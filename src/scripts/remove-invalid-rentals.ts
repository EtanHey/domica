import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeInvalidRentals() {
  console.log('Removing rentals with invalid room counts...\n');

  try {
    // Find all rentals with "?" in the title (indicating unknown room count)
    const { data: invalidRentals, error: fetchError } = await supabase
      .from('rentals')
      .select('id, title')
      .like('title', '%? חדרים%');

    if (fetchError) {
      console.error('Error fetching rentals:', fetchError);
      return;
    }

    console.log(`Found ${invalidRentals?.length || 0} rentals with invalid room counts\n`);

    if (!invalidRentals || invalidRentals.length === 0) {
      console.log('No invalid rentals to remove');
      return;
    }

    // Show the rentals that will be deleted
    console.log('Rentals to be deleted:');
    invalidRentals.forEach(rental => {
      console.log(`- ${rental.title} (ID: ${rental.id})`);
    });

    // Delete these rentals
    const idsToDelete = invalidRentals.map(r => r.id);
    
    const { error: deleteError } = await supabase
      .from('rentals')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting rentals:', deleteError);
      return;
    }

    console.log(`\n✅ Successfully deleted ${invalidRentals.length} rentals with invalid room counts`);

    // Get final count
    const { count } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true });

    console.log(`\nTotal rentals remaining: ${count}`);

  } catch (error) {
    console.error('Script failed:', error);
  }
}

removeInvalidRentals().catch(console.error);