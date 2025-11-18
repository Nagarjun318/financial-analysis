# Supabase Services Table Setup

## SQL Command to Create the Services Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create services table for home service tracking
CREATE TABLE services (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  last_service_date DATE NOT NULL,
  next_service_due DATE NOT NULL,
  service_provider TEXT,
  cost NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index on user_id for faster queries
CREATE INDEX services_user_id_idx ON services(user_id);

-- Create index on next_service_due for sorting
CREATE INDEX services_next_service_due_idx ON services(next_service_due);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own services
CREATE POLICY "Users can view their own services"
  ON services
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own services
CREATE POLICY "Users can insert their own services"
  ON services
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own services
CREATE POLICY "Users can update their own services"
  ON services
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own services
CREATE POLICY "Users can delete their own services"
  ON services
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on any update
CREATE TRIGGER update_services_modtime
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();
```

## Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key (auto-increment) |
| `user_id` | UUID | Foreign key to auth.users |
| `service_name` | TEXT | Name of the service (e.g., "Living Room AC") |
| `service_type` | TEXT | Category of service (AC, Car, Plumbing, etc.) |
| `last_service_date` | DATE | Date when service was last performed |
| `next_service_due` | DATE | Date when next service is due |
| `service_provider` | TEXT | Name of service provider (optional) |
| `cost` | NUMERIC(10,2) | Cost of the service (optional) |
| `notes` | TEXT | Additional notes or reminders (optional) |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Record last update timestamp |

## Features

- **Row Level Security (RLS)**: Each user can only access their own service records
- **Automatic Timestamps**: `created_at` and `updated_at` are managed automatically
- **Indexed Queries**: Fast retrieval by user and sorting by due date
- **Cascade Delete**: Services are deleted when user account is deleted

## Service Types

The application includes these pre-defined service types:
- AC
- Car
- Bike
- Plumbing
- Electrical
- Pest Control
- Water Purifier
- Chimney
- Washing Machine
- Refrigerator
- Geyser
- Garden
- House Cleaning
- Other

You can customize these in the `ServicesPage.tsx` component.
