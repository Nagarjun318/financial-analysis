-- Migration: Add created_on column to assets table
-- This column tracks when the asset was created/acquired

-- Add the created_on column (allows NULL initially for existing records)
ALTER TABLE assets 
ADD COLUMN created_on DATE;

-- Optional: Set created_on to last_updated for existing records as a fallback
UPDATE assets 
SET created_on = last_updated 
WHERE created_on IS NULL AND last_updated IS NOT NULL;

-- For records without any date, you may want to manually set them or leave as NULL
-- NULL values will be handled gracefully by the application logic

COMMENT ON COLUMN assets.created_on IS 'Date when the asset was created or acquired (YYYY-MM-DD)';
