-- Clear all property-related data
-- Run this in Supabase SQL Editor

-- First delete dependent data
DELETE FROM property_amenities;
DELETE FROM property_images;
DELETE FROM scrape_metadata;
DELETE FROM duplicate_reviews;
DELETE FROM property_merge_history;

-- Then delete the main properties
DELETE FROM properties;

-- Verify the data is cleared
SELECT COUNT(*) as property_count FROM properties;
SELECT COUNT(*) as image_count FROM property_images;

-- Note: If you get permission errors, you may need to run this as the postgres user
-- or check your RLS policies