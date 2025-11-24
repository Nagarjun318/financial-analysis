-- Migration to add 'principal' column to liabilities table
-- This simplifies the schema: store only the original principal amount,
-- current principal will be calculated from payment history

-- Add the new principal column (nullable for migration)
ALTER TABLE liabilities 
ADD COLUMN IF NOT EXISTS principal DECIMAL(15,2);

-- Migrate existing data: copy opening_principal to principal
UPDATE liabilities 
SET principal = opening_principal 
WHERE principal IS NULL;

-- Optional: Add comment to document the column
COMMENT ON COLUMN liabilities.principal IS 'Original loan principal amount. Current balance is calculated from payment history.';

-- Note: We keep opening_principal and current_principal columns for backward compatibility
-- They can be removed in a future migration after all clients are updated
