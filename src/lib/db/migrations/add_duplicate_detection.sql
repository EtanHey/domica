-- Enable PostGIS extension for location-based duplicate detection
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add new columns to rentals table for duplicate detection
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(20),
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS master_rental_id UUID REFERENCES rentals(id),
ADD COLUMN IF NOT EXISTS duplicate_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS duplicate_status VARCHAR(20) DEFAULT 'unique' CHECK (duplicate_status IN ('unique', 'master', 'duplicate', 'review')),
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update existing rentals to have source information from facebook_id
UPDATE rentals 
SET source_platform = 'yad2', 
    source_id = facebook_id
WHERE source_id IS NULL AND facebook_id IS NOT NULL;

-- Create unique constraint for source tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_source 
ON rentals(source_platform, source_id) 
WHERE deleted_at IS NULL;

-- Add location index
CREATE INDEX IF NOT EXISTS idx_rentals_location_gist 
ON rentals USING GIST(location);

-- Add phone index
CREATE INDEX IF NOT EXISTS idx_rentals_phone_normalized 
ON rentals(phone_normalized);

-- Update rental_images table for image hashing
ALTER TABLE rental_images
ADD COLUMN IF NOT EXISTS phash VARCHAR(64),
ADD COLUMN IF NOT EXISTS dhash VARCHAR(64),
ADD COLUMN IF NOT EXISTS average_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS ai_features JSONB;

-- Create duplicate review queue table
CREATE TABLE IF NOT EXISTS duplicate_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_a_id UUID REFERENCES rentals(id),
    rental_b_id UUID REFERENCES rentals(id),
    rental_data JSONB, -- For new rentals not yet in DB
    matched_rental_id UUID REFERENCES rentals(id),
    score DECIMAL(5,2),
    score_breakdown JSONB,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    decision TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create merge history table
CREATE TABLE IF NOT EXISTS rental_merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_rental_id UUID REFERENCES rentals(id),
    merged_rental_id UUID,
    merged_fields JSONB,
    previous_values JSONB,
    merge_reason TEXT,
    merged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update scrape_metadata to include source type and ID
ALTER TABLE scrape_metadata
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS source_name VARCHAR(100);

-- Create function to find nearby rentals
CREATE OR REPLACE FUNCTION find_nearby_rentals(
  lat FLOAT,
  lng FLOAT,
  radius_meters INTEGER DEFAULT 200,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price_per_month NUMERIC,
  location GEOGRAPHY,
  distance_meters FLOAT,
  phone_normalized VARCHAR,
  source_platform VARCHAR,
  source_id VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.price_per_month,
    r.location,
    ST_Distance(
      r.location,
      ST_MakePoint(lng, lat)::geography
    ) as distance_meters,
    r.phone_normalized,
    r.source_platform,
    r.source_id
  FROM rentals r
  WHERE 
    r.deleted_at IS NULL
    AND r.duplicate_status != 'duplicate'
    AND r.location IS NOT NULL
    AND ST_DWithin(
      r.location,
      ST_MakePoint(lng, lat)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for duplicate statistics
CREATE OR REPLACE VIEW duplicate_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) FILTER (WHERE duplicate_status = 'duplicate') as duplicates_found,
    COUNT(*) FILTER (WHERE duplicate_status = 'review') as pending_review,
    COUNT(*) FILTER (WHERE duplicate_status = 'unique') as unique_listings,
    AVG(duplicate_score) FILTER (WHERE duplicate_status = 'duplicate') as avg_duplicate_score
FROM rentals
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;