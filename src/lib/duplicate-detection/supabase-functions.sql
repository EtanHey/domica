-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Function to find nearby rentals using PostGIS
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
  price NUMERIC,
  location GEOGRAPHY,
  distance_meters FLOAT,
  phone_normalized TEXT,
  images JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.price,
    r.location,
    ST_Distance(
      r.location,
      ST_MakePoint(lng, lat)::geography
    ) as distance_meters,
    r.phone_normalized,
    COALESCE(
      json_agg(
        json_build_object(
          'id', ri.id,
          'url', ri.url,
          'phash', ri.phash
        )
      ) FILTER (WHERE ri.id IS NOT NULL),
      '[]'::jsonb
    ) as images
  FROM rentals r
  LEFT JOIN rental_images ri ON ri.rental_id = r.id
  WHERE 
    r.deleted_at IS NULL
    AND r.duplicate_status != 'duplicate'
    AND ST_DWithin(
      r.location,
      ST_MakePoint(lng, lat)::geography,
      radius_meters
    )
  GROUP BY r.id
  ORDER BY distance_meters ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate text similarity using PostgreSQL's similarity functions
CREATE OR REPLACE FUNCTION calculate_text_similarity(
  text1 TEXT,
  text2 TEXT
)
RETURNS FLOAT AS $$
DECLARE
  similarity_score FLOAT;
BEGIN
  -- Use trigram similarity (requires pg_trgm extension)
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  
  -- Calculate similarity
  similarity_score := similarity(
    lower(trim(text1)),
    lower(trim(text2))
  );
  
  RETURN similarity_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get rental statistics
CREATE OR REPLACE FUNCTION get_duplicate_statistics(
  date_from TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
  date_to TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
  total_rentals BIGINT,
  unique_rentals BIGINT,
  duplicate_rentals BIGINT,
  pending_reviews BIGINT,
  merge_count BIGINT,
  duplicate_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_rentals,
    COUNT(*) FILTER (WHERE duplicate_status = 'unique') as unique_rentals,
    COUNT(*) FILTER (WHERE duplicate_status = 'duplicate') as duplicate_rentals,
    COUNT(*) FILTER (WHERE duplicate_status = 'review') as pending_reviews,
    (SELECT COUNT(*) FROM rental_merge_history WHERE merged_at BETWEEN date_from AND date_to) as merge_count,
    ROUND(
      COUNT(*) FILTER (WHERE duplicate_status = 'duplicate')::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100,
      2
    ) as duplicate_rate
  FROM rentals
  WHERE created_at BETWEEN date_from AND date_to;
END;
$$ LANGUAGE plpgsql;

-- Function to merge rental data
CREATE OR REPLACE FUNCTION merge_rental_data(
  master_id UUID,
  duplicate_id UUID,
  merge_fields JSONB
)
RETURNS VOID AS $$
DECLARE
  master_record RECORD;
  duplicate_record RECORD;
  previous_values JSONB;
BEGIN
  -- Get both records
  SELECT * INTO master_record FROM rentals WHERE id = master_id;
  SELECT * INTO duplicate_record FROM rentals WHERE id = duplicate_id;
  
  IF master_record IS NULL OR duplicate_record IS NULL THEN
    RAISE EXCEPTION 'Rental not found';
  END IF;
  
  -- Store previous values
  previous_values := jsonb_build_object(
    'title', master_record.title,
    'description', master_record.description,
    'price', master_record.price,
    'phone', master_record.phone_normalized
  );
  
  -- Update master record based on merge_fields
  UPDATE rentals
  SET
    title = CASE 
      WHEN merge_fields ? 'title' THEN duplicate_record.title 
      ELSE title 
    END,
    description = CASE 
      WHEN merge_fields ? 'description' THEN duplicate_record.description 
      ELSE description 
    END,
    price = CASE 
      WHEN merge_fields ? 'price' THEN duplicate_record.price 
      ELSE price 
    END,
    phone_original = CASE 
      WHEN merge_fields ? 'phone' THEN duplicate_record.phone_original 
      ELSE phone_original 
    END,
    phone_normalized = CASE 
      WHEN merge_fields ? 'phone' THEN duplicate_record.phone_normalized 
      ELSE phone_normalized 
    END,
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE id = master_id;
  
  -- Mark duplicate as merged
  UPDATE rentals
  SET 
    duplicate_status = 'duplicate',
    master_rental_id = master_id,
    updated_at = NOW()
  WHERE id = duplicate_id;
  
  -- Record merge history
  INSERT INTO rental_merge_history (
    master_rental_id,
    merged_rental_id,
    merged_fields,
    previous_values,
    merge_reason
  ) VALUES (
    master_id,
    duplicate_id,
    merge_fields,
    previous_values,
    'duplicate_detected'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for fast duplicate detection
CREATE INDEX idx_rentals_duplicate_detection ON rentals(
  source_platform,
  source_id,
  phone_normalized,
  duplicate_status
) WHERE deleted_at IS NULL;

-- Index for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_rentals_title_trgm ON rentals USING gin(title gin_trgm_ops);
CREATE INDEX idx_rentals_description_trgm ON rentals USING gin(description gin_trgm_ops);

-- View for duplicate review queue
CREATE OR REPLACE VIEW duplicate_review_queue AS
SELECT 
  dr.id,
  dr.score,
  dr.score_breakdown,
  dr.status,
  dr.created_at,
  r1.title as rental_a_title,
  r1.price as rental_a_price,
  r1.address as rental_a_address,
  r2.title as rental_b_title,
  r2.price as rental_b_price,
  r2.address as rental_b_address
FROM duplicate_reviews dr
JOIN rentals r1 ON r1.id = dr.rental_a_id
JOIN rentals r2 ON r2.id = dr.rental_b_id
WHERE dr.status = 'pending'
ORDER BY dr.score DESC, dr.created_at ASC;