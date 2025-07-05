import { createClient } from '@supabase/supabase-js';
import { DuplicateDetectionService } from '../lib/duplicate-detection';
import { RentalInput, DatabaseRental } from '../lib/duplicate-detection/types';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const duplicateDetector = new DuplicateDetectionService(supabase as any, {
  enableAIComparison: false, // Disable AI for bulk scanning
  maxCandidateRadius: 500, // Increase radius for thorough check
});

interface DuplicateGroup {
  masterId: string;
  masterTitle: string;
  masterPrice: number;
  duplicates: Array<{
    id: string;
    title: string;
    price: number;
    score: number;
    scoreBreakdown: any;
  }>;
}

async function findDuplicates() {
  console.log('🔍 Starting duplicate detection scan...\n');

  try {
    // Fetch all active rentals
    const { data: rentals, error } = await supabase
      .from('rentals')
      .select(`
        *,
        images:rental_images(id, image_url, phash)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching rentals:', error);
      return;
    }

    if (!rentals || rentals.length === 0) {
      console.log('No rentals found in database');
      return;
    }

    console.log(`Found ${rentals.length} rentals to analyze\n`);

    const duplicateGroups: Map<string, DuplicateGroup> = new Map();
    const processedIds = new Set<string>();
    let duplicatesFound = 0;
    let highConfidenceDuplicates = 0;
    let mediumConfidenceDuplicates = 0;

    // Process each rental
    for (let i = 0; i < rentals.length; i++) {
      const rental = rentals[i];
      
      // Skip if already processed as a duplicate
      if (processedIds.has(rental.id)) {
        continue;
      }

      console.log(`\n[${i + 1}/${rentals.length}] Analyzing: ${rental.title}`);

      // Convert to RentalInput format
      const rentalInput: RentalInput = {
        title: rental.title,
        description: rental.description,
        price: rental.price_per_month,
        currency: rental.currency || 'ILS',
        address: rental.location_text,
        city: rental.location_text?.includes(',') ? rental.location_text.split(',')[1].trim() : rental.location_text,
        phone: rental.phone_original || rental.phone_normalized,
        images: rental.images?.map((img: any) => img.image_url) || [],
        sourcePlatform: rental.source_platform || 'yad2',
        sourceId: rental.source_id || rental.facebook_id,
        sourceUrl: '',
        metadata: {
          bedrooms: rental.bedrooms,
          bathrooms: rental.bathrooms,
          property_type: rental.property_type,
        }
      };

      // Check against all rentals that come after this one
      for (let j = i + 1; j < rentals.length; j++) {
        const compareRental = rentals[j];
        
        // Skip if already processed
        if (processedIds.has(compareRental.id)) {
          continue;
        }

        // Calculate similarity score
        const score = await calculateSimilarityScore(rentalInput, compareRental);

        if (score.totalScore >= 65) {
          duplicatesFound++;
          
          if (score.totalScore >= 85) {
            highConfidenceDuplicates++;
            console.log(`  ✅ HIGH confidence duplicate found (${score.totalScore} points): ${compareRental.title}`);
          } else {
            mediumConfidenceDuplicates++;
            console.log(`  ⚠️  MEDIUM confidence duplicate found (${score.totalScore} points): ${compareRental.title}`);
          }

          // Add to duplicate group
          if (!duplicateGroups.has(rental.id)) {
            duplicateGroups.set(rental.id, {
              masterId: rental.id,
              masterTitle: rental.title,
              masterPrice: rental.price_per_month,
              duplicates: []
            });
          }

          duplicateGroups.get(rental.id)!.duplicates.push({
            id: compareRental.id,
            title: compareRental.title,
            price: compareRental.price_per_month,
            score: score.totalScore,
            scoreBreakdown: score.breakdown
          });

          processedIds.add(compareRental.id);
        }
      }
    }

    // Generate report
    console.log('\n' + '='.repeat(80));
    console.log('📊 DUPLICATE DETECTION REPORT');
    console.log('='.repeat(80) + '\n');

    console.log(`Total rentals analyzed: ${rentals.length}`);
    console.log(`Duplicate listings found: ${duplicatesFound}`);
    console.log(`High confidence (85+ score): ${highConfidenceDuplicates}`);
    console.log(`Medium confidence (65-84 score): ${mediumConfidenceDuplicates}`);
    console.log(`Unique duplicate groups: ${duplicateGroups.size}\n`);

    if (duplicateGroups.size > 0) {
      console.log('📋 DUPLICATE GROUPS:');
      console.log('-'.repeat(80));

      let groupIndex = 1;
      for (const [masterId, group] of duplicateGroups) {
        console.log(`\nGroup ${groupIndex}: ${group.masterTitle} (₪${group.masterPrice})`);
        console.log(`Master ID: ${masterId}`);
        console.log('Duplicates:');
        
        for (const dup of group.duplicates) {
          console.log(`  - ${dup.title} (₪${dup.price})`);
          console.log(`    ID: ${dup.id}`);
          console.log(`    Score: ${dup.score} points`);
          console.log(`    Breakdown: Location=${dup.scoreBreakdown.locationScore}, ` +
                      `Title=${dup.scoreBreakdown.titleScore}, ` +
                      `Desc=${dup.scoreBreakdown.descriptionScore}, ` +
                      `Price=${dup.scoreBreakdown.priceScore}, ` +
                      `Images=${dup.scoreBreakdown.imageScore}, ` +
                      `Phone=${dup.scoreBreakdown.phoneScore}`);
        }
        groupIndex++;
      }
    }

    // Save report to file
    const report = {
      scanDate: new Date().toISOString(),
      totalRentals: rentals.length,
      duplicatesFound: duplicatesFound,
      highConfidence: highConfidenceDuplicates,
      mediumConfidence: mediumConfidenceDuplicates,
      duplicateGroups: Array.from(duplicateGroups.values())
    };

    await saveReport(report);

  } catch (error) {
    console.error('Error during duplicate detection:', error);
  }
}

async function calculateSimilarityScore(
  newRental: RentalInput,
  existingRental: DatabaseRental
): Promise<{ totalScore: number; breakdown: any }> {
  // Use the duplicate detection service's internal method
  // We'll create a minimal version here since the method is private
  
  const breakdown = {
    locationScore: 0,
    titleScore: 0,
    descriptionScore: 0,
    priceScore: 0,
    imageScore: 0,
    phoneScore: 0,
  };

  // Location scoring (simplified without PostGIS)
  if (newRental.address && existingRental.location_text) {
    const addr1 = newRental.address.toLowerCase();
    const addr2 = (existingRental.location_text || '').toLowerCase();
    
    // Check for common words
    const words1 = addr1.split(/[\s,]+/).filter(w => w.length > 2);
    const words2 = addr2.split(/[\s,]+/).filter(w => w.length > 2);
    const commonWords = words1.filter(w => words2.includes(w));
    
    if (commonWords.length >= 3) breakdown.locationScore = 35;
    else if (commonWords.length >= 2) breakdown.locationScore = 25;
    else if (commonWords.length >= 1) breakdown.locationScore = 15;
  }

  // Title similarity
  if (newRental.title && existingRental.title) {
    const title1 = newRental.title.toLowerCase();
    const title2 = existingRental.title.toLowerCase();
    
    if (title1 === title2) breakdown.titleScore = 20;
    else {
      // Check for common patterns (rooms, location)
      const rooms1 = title1.match(/(\d+(?:\.\d+)?)\s*חדרים/);
      const rooms2 = title2.match(/(\d+(?:\.\d+)?)\s*חדרים/);
      
      if (rooms1 && rooms2 && rooms1[1] === rooms2[1]) {
        breakdown.titleScore += 10;
      }
      
      // Check location similarity in title
      const titleWords1 = title1.split(/[\s,]+/).filter(w => w.length > 2);
      const titleWords2 = title2.split(/[\s,]+/).filter(w => w.length > 2);
      const commonTitleWords = titleWords1.filter(w => titleWords2.includes(w));
      
      if (commonTitleWords.length >= 2) breakdown.titleScore += 10;
      else if (commonTitleWords.length >= 1) breakdown.titleScore += 5;
    }
  }

  // Price similarity
  if (newRental.price && existingRental.price_per_month) {
    const priceDiff = Math.abs(newRental.price - existingRental.price_per_month);
    const priceRatio = priceDiff / Math.max(newRental.price, existingRental.price_per_month);
    
    if (priceRatio < 0.05) breakdown.priceScore = 10;
    else if (priceRatio < 0.1) breakdown.priceScore = 7;
    else if (priceRatio < 0.2) breakdown.priceScore = 3;
  }

  // Description similarity (simplified)
  if (newRental.description && existingRental.description) {
    const desc1 = newRental.description.toLowerCase();
    const desc2 = (existingRental.description || '').toLowerCase();
    
    if (desc1.length > 50 && desc2.length > 50) {
      // Check for common unique words
      const descWords1 = desc1.split(/[\s,]+/).filter(w => w.length > 4);
      const descWords2 = desc2.split(/[\s,]+/).filter(w => w.length > 4);
      const commonDescWords = descWords1.filter(w => descWords2.includes(w));
      
      const overlap = commonDescWords.length / Math.min(descWords1.length, descWords2.length);
      breakdown.descriptionScore = Math.round(overlap * 15);
    }
  }

  // Image comparison (check if same URLs)
  if (newRental.images?.length && existingRental.images?.length) {
    const existingUrls = existingRental.images.map((img: any) => img.image_url);
    const matchingImages = newRental.images.filter(url => existingUrls.includes(url));
    
    if (matchingImages.length > 0) {
      breakdown.imageScore = Math.min(30, matchingImages.length * 10);
    }
  }

  // Phone comparison
  if (newRental.phone && existingRental.phone_normalized) {
    const phone1 = normalizePhone(newRental.phone);
    const phone2 = existingRental.phone_normalized;
    
    if (phone1 === phone2) {
      breakdown.phoneScore = 20;
    }
  }

  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  return { totalScore, breakdown };
}

function normalizePhone(phone: string): string {
  // Simple normalization - remove non-digits
  return phone.replace(/\D/g, '');
}

async function saveReport(report: any) {
  const fs = await import('fs');
  const reportPath = path.join(process.cwd(), `duplicate_report_${new Date().toISOString().split('T')[0]}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📁 Report saved to: ${reportPath}`);
}

// Run the script
findDuplicates().catch(console.error);