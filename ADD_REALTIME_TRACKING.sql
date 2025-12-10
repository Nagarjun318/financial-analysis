-- Add real-time tracking fields to investments table
-- Run this migration to enable real-time price updates for investments

ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS quantity DECIMAL,
ADD COLUMN IF NOT EXISTS symbol VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP,
ADD COLUMN IF NOT EXISTS auto_refresh BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN investments.quantity IS 'Number of units owned (e.g., 0.5 BTC, 10 shares)';
COMMENT ON COLUMN investments.symbol IS 'Trading symbol for real-time price lookup';
COMMENT ON COLUMN investments.last_updated IS 'Timestamp of last price update';
COMMENT ON COLUMN investments.auto_refresh IS 'Enable automatic price updates';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investments_symbol ON investments(symbol) WHERE symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investments_auto_refresh ON investments(auto_refresh) WHERE auto_refresh = TRUE;
