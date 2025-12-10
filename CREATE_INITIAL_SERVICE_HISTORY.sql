-- Add trigger to create initial service history when a new service is inserted
-- This ensures that the first service entry is recorded in the history table

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS service_insert_history_trigger ON services;

-- Create function to create initial history on service insert
CREATE OR REPLACE FUNCTION create_initial_service_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial history entry for the newly inserted service
    INSERT INTO service_history (
        service_id,
        user_id,
        service_date,
        service_provider,
        cost,
        notes,
        next_service_due
    ) VALUES (
        NEW.id,
        NEW.user_id,
        NEW.last_service_date,
        NEW.service_provider,
        NEW.cost,
        NEW.notes,
        NEW.next_service_due
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create history on service insert
CREATE TRIGGER service_insert_history_trigger
    AFTER INSERT ON services
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_service_history();

-- Optionally, create history for existing services that don't have any history yet
-- This is a one-time operation to backfill history for existing services
INSERT INTO service_history (
    service_id,
    user_id,
    service_date,
    service_provider,
    cost,
    notes,
    next_service_due
)
SELECT 
    s.id,
    s.user_id,
    s.last_service_date,
    s.service_provider,
    s.cost,
    s.notes,
    s.next_service_due
FROM services s
WHERE NOT EXISTS (
    SELECT 1 FROM service_history sh 
    WHERE sh.service_id = s.id
);
