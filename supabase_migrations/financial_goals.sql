-- Create financial_goals table
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  deadline DATE NOT NULL,
  category TEXT CHECK (category IN ('savings', 'investment', 'debt', 'purchase', 'other')) DEFAULT 'other',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);

-- Enable Row Level Security
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own goals
CREATE POLICY "Users can view their own goals" ON financial_goals
  FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy to allow users to insert their own goals
CREATE POLICY "Users can insert their own goals" ON financial_goals
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create policy to allow users to update their own goals
CREATE POLICY "Users can update their own goals" ON financial_goals
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policy to allow users to delete their own goals
CREATE POLICY "Users can delete their own goals" ON financial_goals
  FOR DELETE USING (auth.uid()::text = user_id);
