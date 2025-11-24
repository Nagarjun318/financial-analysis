-- Migration: Update assets type constraint to allow any string value
-- This removes the restrictive check constraint and allows custom asset types

-- Drop the existing check constraint
ALTER TABLE assets 
DROP CONSTRAINT IF EXISTS assets_type_check;

-- Optional: Add a new constraint that only ensures the type is not empty
-- (You can skip this if you want to allow any value including empty strings)
ALTER TABLE assets 
ADD CONSTRAINT assets_type_not_empty 
CHECK (type IS NOT NULL AND length(trim(type)) > 0);

-- Alternative: If you want to keep some validation but allow more types
-- Uncomment the following instead of the above:
-- ALTER TABLE assets 
-- ADD CONSTRAINT assets_type_check 
-- CHECK (type IN ('cash', 'investment', 'property', 'gold', 'vehicle', 'jewelry', 'other') OR length(type) > 0);

COMMENT ON COLUMN assets.type IS 'Type of asset - accepts any custom string value (e.g., cash, investment, property, gold, vehicle, jewelry, etc.)';
