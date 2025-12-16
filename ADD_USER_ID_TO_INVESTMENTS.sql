-- Add user_id column to investments table for user-specific data isolation
-- Run this in your Supabase SQL Editor

-- Add user_id column (references auth.users)
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);

-- Update RLS policy to filter by user_id
DROP POLICY IF EXISTS "Allow all operations on investments" ON investments;

-- Policy: Users can only see their own investments
CREATE POLICY "Users can view own investments" ON investments
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can only insert their own investments
CREATE POLICY "Users can insert own investments" ON investments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own investments
CREATE POLICY "Users can update own investments" ON investments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own investments
CREATE POLICY "Users can delete own investments" ON investments
    FOR DELETE
    USING (auth.uid() = user_id);
