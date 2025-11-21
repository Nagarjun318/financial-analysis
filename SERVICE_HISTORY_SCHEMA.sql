-- Home Service History Schema
-- Run this in your Supabase SQL Editor

-- Create service_history table to track all service records
CREATE TABLE IF NOT EXISTS service_history (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    service_date DATE NOT NULL,
    service_provider TEXT,
    cost DECIMAL(10, 2),
    notes TEXT,
    odometer_reading INTEGER, -- For vehicles
    work_performed TEXT, -- Description of work done
    parts_replaced TEXT[], -- Array of parts that were replaced
    next_service_due DATE, -- When this service was done, what was the next due date
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_history_user_id ON service_history(user_id);
CREATE INDEX IF NOT EXISTS idx_service_history_service_date ON service_history(service_date DESC);

-- Enable Row Level Security
ALTER TABLE service_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own service history" ON service_history
    FOR SELECT
    USING (auth.uid()::text = user_id OR user_id = 'demo-user');

CREATE POLICY "Users can insert their own service history" ON service_history
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR user_id = 'demo-user');

CREATE POLICY "Users can update their own service history" ON service_history
    FOR UPDATE
    USING (auth.uid()::text = user_id OR user_id = 'demo-user');

CREATE POLICY "Users can delete their own service history" ON service_history
    FOR DELETE
    USING (auth.uid()::text = user_id OR user_id = 'demo-user');

-- Function to automatically create history entry when service is updated
CREATE OR REPLACE FUNCTION create_service_history_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create history if the last_service_date or cost changed
    IF (OLD.last_service_date IS DISTINCT FROM NEW.last_service_date) 
       OR (OLD.cost IS DISTINCT FROM NEW.cost) THEN
        INSERT INTO service_history (
            service_id,
            user_id,
            service_date,
            service_provider,
            cost,
            notes,
            next_service_due
        ) VALUES (
            OLD.id,
            OLD.user_id,
            OLD.last_service_date,
            OLD.service_provider,
            OLD.cost,
            OLD.notes,
            OLD.next_service_due
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create history on service update
DROP TRIGGER IF EXISTS service_update_history_trigger ON services;
CREATE TRIGGER service_update_history_trigger
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION create_service_history_on_update();

-- Function to get service history with statistics
CREATE OR REPLACE FUNCTION get_service_statistics(p_service_id INTEGER)
RETURNS TABLE (
    total_services BIGINT,
    total_cost DECIMAL,
    average_cost DECIMAL,
    last_service_date DATE,
    average_interval_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_services,
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(cost), 0) as average_cost,
        MAX(service_date) as last_service_date,
        CASE 
            WHEN COUNT(*) > 1 THEN
                CAST(
                    (MAX(service_date) - MIN(service_date)) / NULLIF(COUNT(*) - 1, 0)
                    AS INTEGER
                )
            ELSE 0
        END as average_interval_days
    FROM service_history
    WHERE service_id = p_service_id;
END;
$$ LANGUAGE plpgsql;
