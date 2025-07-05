import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Need service key for DDL operations
);

async function runMigration() {
  console.log('🚀 Running duplicate detection migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'src/lib/db/migrations/add_duplicate_detection.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into individual statements (by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      // Show first 100 chars of statement
      console.log(`  ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });

      if (error) {
        console.error(`  ❌ Error:`, error.message);
        
        // Some errors are expected (e.g., "already exists")
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('IF NOT EXISTS')) {
          console.log(`  ⚠️  Continuing (non-fatal error)...`);
        } else {
          throw error;
        }
      } else {
        console.log(`  ✅ Success`);
      }
    }

    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n💡 TIP: You may need to run this migration directly in Supabase SQL Editor');
    console.log('   The migration file is at: src/lib/db/migrations/add_duplicate_detection.sql');
  }
}

// Check if we have the service key
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not found in environment variables');
  console.log('\n💡 To run migrations, you have two options:');
  console.log('   1. Add SUPABASE_SERVICE_KEY to your .env.local file');
  console.log('   2. Run the migration manually in Supabase SQL Editor');
  console.log('\nMigration file: src/lib/db/migrations/add_duplicate_detection.sql');
  process.exit(1);
}

// Run the migration
runMigration().catch(console.error);