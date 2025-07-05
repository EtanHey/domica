# Duplicate Detection System for Rental Listings

## Overview

A multi-layered duplicate detection system that prevents duplicate rental listings from entering the database while intelligently merging new information when updates are found.

## Detection Strategies

### 1. Exact Match Detection (Fast Path)

**Database Level - Immediate rejection of obvious duplicates**

```sql
-- Unique constraints
CREATE UNIQUE INDEX idx_rentals_exact_match ON rentals(
    ST_SnapToGrid(location, 0.00001), -- ~1 meter precision
    source_id,
    source_platform
) WHERE deleted_at IS NULL;

-- Additional indexes for fast lookups
CREATE INDEX idx_rentals_location ON rentals USING GIST(location);
CREATE INDEX idx_rentals_phone ON rentals(phone_normalized);
```

### 2. Similarity Detection (Scoring System)

**Application Level - Weighted scoring for potential matches**

```typescript
interface DuplicateScore {
  rentalId: string;
  totalScore: number;
  breakdown: {
    locationScore: number; // 0-40 points
    titleScore: number; // 0-20 points
    descriptionScore: number; // 0-15 points
    priceScore: number; // 0-10 points
    imageScore: number; // 0-30 points
    phoneScore: number; // 0-20 points
  };
  confidence: 'high' | 'medium' | 'low';
}

// Thresholds
const DUPLICATE_THRESHOLD = 85; // Definitely duplicate
const REVIEW_THRESHOLD = 65; // Needs manual/AI review
const UNIQUE_THRESHOLD = 40; // Definitely unique
```

### 3. Detection Components

#### Location Matching (40 points max)

```typescript
// Exact coordinates: 40 points
// Within 10m: 35 points
// Within 50m: 25 points
// Within 100m: 15 points
// Same street: 10 points
// Same neighborhood: 5 points
```

#### Title/Description Matching (35 points max)

```typescript
// Use PostgreSQL full-text search
// Levenshtein distance for typos
// TF-IDF for semantic similarity
// Hebrew language support with proper tokenization
```

#### Image Matching (30 points max)

```typescript
// Perceptual hashing (pHash) for quick comparison
// AI service for detailed comparison when pHash is close
// Store image hashes in database for fast lookup
```

#### Phone Number Matching (20 points max)

```typescript
// Normalize phone numbers (remove spaces, dashes, country codes)
// Exact match: 20 points
// Same but different format: 15 points
```

## Database Schema

```sql
-- Main rentals table with duplicate tracking
CREATE TABLE rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core fields
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'ILS',

    -- Location
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    city TEXT,
    neighborhood TEXT,

    -- Contact
    phone_original TEXT,
    phone_normalized TEXT,
    contact_name TEXT,

    -- Source tracking
    source_platform TEXT NOT NULL, -- 'yad2', 'facebook', etc
    source_id TEXT NOT NULL,
    source_url TEXT,
    first_seen_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW(),

    -- Duplicate detection
    master_rental_id UUID REFERENCES rentals(id),
    duplicate_score DECIMAL(5,2),
    duplicate_status TEXT CHECK (duplicate_status IN ('unique', 'master', 'duplicate', 'review')),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT unique_source UNIQUE(source_platform, source_id)
);

-- Image comparison table
CREATE TABLE rental_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID REFERENCES rentals(id),
    url TEXT NOT NULL,

    -- Hashes for comparison
    phash TEXT,
    dhash TEXT,
    average_hash TEXT,

    -- AI comparison results cache
    ai_features JSONB,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Duplicate review queue
CREATE TABLE duplicate_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_a_id UUID REFERENCES rentals(id),
    rental_b_id UUID REFERENCES rentals(id),

    score DECIMAL(5,2),
    score_breakdown JSONB,

    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    decision TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

-- Merge history
CREATE TABLE rental_merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_rental_id UUID REFERENCES rentals(id),
    merged_rental_id UUID,

    merged_fields JSONB, -- Which fields were updated
    previous_values JSONB, -- Original values before merge

    merge_reason TEXT,
    merged_at TIMESTAMP DEFAULT NOW()
);
```

## Merge Strategy

### Information Priority Rules

1. **Keep the most complete data**
   - Longer descriptions over shorter ones
   - More images over fewer images
   - Filled fields over empty fields

2. **Recency for volatile data**
   - Latest price
   - Latest availability status
   - Latest contact information

3. **Accumulate unique data**
   - Combine all unique images
   - Merge amenities lists
   - Preserve all source URLs

### Merge Algorithm

```typescript
async function mergeRentals(master: Rental, duplicate: Rental): Promise<Rental> {
  const merged = { ...master };

  // Title: Keep longer, more descriptive
  if (duplicate.title.length > master.title.length) {
    merged.title = duplicate.title;
  }

  // Description: Keep longer or combine if significantly different
  if (!master.description || duplicate.description?.length > master.description.length) {
    merged.description = duplicate.description;
  }

  // Price: Keep most recent
  if (duplicate.last_seen_at > master.last_seen_at) {
    merged.price = duplicate.price;
  }

  // Images: Combine unique images
  merged.images = await deduplicateImages([...master.images, ...duplicate.images]);

  // Track merge
  await recordMerge(master.id, duplicate.id, changes);

  return merged;
}
```

## AI Integration Options

### 1. Image Comparison Service

**Options:**

- **OpenAI Vision API**: Best for understanding image content
- **AWS Rekognition**: Good for object/scene detection
- **Google Cloud Vision**: Strong text extraction from images
- **Hugging Face Models**: Self-hosted option

**Recommended: Hybrid Approach**

```typescript
// Fast path: Perceptual hashing
const quickMatch = await compareHashes(imageA, imageB);
if (quickMatch.similarity > 0.95) return true;
if (quickMatch.similarity < 0.7) return false;

// Slow path: AI comparison for uncertain cases
const aiMatch = await openai.vision.compare(imageA, imageB, {
  prompt:
    'Are these two images of the same rental property? Consider angle, lighting, and furniture changes.',
});
```

### 2. Text Similarity

**For Hebrew text support:**

- Use PostgreSQL's built-in full-text search with Hebrew dictionary
- Elasticsearch for more advanced text analysis
- OpenAI embeddings for semantic similarity

## Implementation Pipeline

```typescript
class DuplicateDetector {
  async checkDuplicate(newRental: RentalInput): Promise<DuplicateResult> {
    // Phase 1: Exact match check
    const exactMatch = await this.checkExactMatch(newRental);
    if (exactMatch) {
      return { isDuplicate: true, match: exactMatch, confidence: 'high' };
    }

    // Phase 2: Location-based candidates
    const nearbyCandidates = await this.findNearbyRentals(
      newRental.location,
      radius: 200 // meters
    );

    // Phase 3: Score each candidate
    const scores = await Promise.all(
      nearbyCandidates.map(candidate =>
        this.calculateSimilarityScore(newRental, candidate)
      )
    );

    // Phase 4: Process results
    const bestMatch = scores.sort((a, b) => b.totalScore - a.totalScore)[0];

    if (bestMatch.totalScore >= DUPLICATE_THRESHOLD) {
      return { isDuplicate: true, match: bestMatch, confidence: 'high' };
    }

    if (bestMatch.totalScore >= REVIEW_THRESHOLD) {
      await this.queueForReview(newRental, bestMatch);
      return { isDuplicate: false, pendingReview: true, confidence: 'medium' };
    }

    return { isDuplicate: false, confidence: 'high' };
  }
}
```

## Performance Considerations

1. **Caching**
   - Cache image hashes
   - Cache AI comparison results
   - Use Redis for temporary duplicate checks

2. **Batch Processing**
   - Process new listings in batches
   - Parallel image comparison
   - Background jobs for AI processing

3. **Database Optimization**
   - Spatial indexes for location queries
   - Full-text indexes for description search
   - Partial indexes for active listings only

## Monitoring & Analytics

```sql
-- Duplicate detection statistics
CREATE VIEW duplicate_stats AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) FILTER (WHERE duplicate_status = 'duplicate') as duplicates_found,
    COUNT(*) FILTER (WHERE duplicate_status = 'review') as pending_review,
    AVG(duplicate_score) FILTER (WHERE duplicate_status = 'duplicate') as avg_duplicate_score
FROM rentals
GROUP BY DATE_TRUNC('day', created_at);
```

## Cost Optimization

1. **AI Usage**
   - Only use AI for uncertain cases (65-85 score range)
   - Batch API calls when possible
   - Cache results aggressively

2. **Processing Order**
   - Cheapest checks first (database)
   - Medium cost (hashing, text analysis)
   - Expensive last (AI vision)

## Future Enhancements

1. **Machine Learning Model**
   - Train on confirmed duplicates/non-duplicates
   - Improve scoring weights over time
   - Reduce AI API dependency

2. **User Feedback Loop**
   - Allow users to report duplicates
   - Learn from manual reviews
   - Adjust thresholds dynamically

3. **Cross-Platform Detection**
   - Detect same listing across Yad2, Facebook, etc.
   - Unified rental profiles
   - Source preference rules
