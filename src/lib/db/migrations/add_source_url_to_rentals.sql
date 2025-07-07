-- Add source_url column to rentals table
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Copy existing source_url data from scrape_metadata
UPDATE rentals r
SET source_url = sm.source_url
FROM scrape_metadata sm
WHERE sm.rental_id = r.id
AND sm.source_url IS NOT NULL
AND r.source_url IS NULL;

-- Add index for source_url
CREATE INDEX IF NOT EXISTS idx_rentals_source_url ON rentals(source_url);