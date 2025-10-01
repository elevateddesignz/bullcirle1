/*
  # Fix account_data and watchlist tables

  1. Changes
    - Add IF NOT EXISTS to policy creation
    - Drop existing policies before creating new ones
    - Ensure tables and constraints are created safely
  
  2. Security
    - Maintain existing RLS policies
    - Add policies for authenticated users
*/

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
  -- Drop account_data policies if they exist
  DROP POLICY IF EXISTS "Users can view their own account data" ON account_data;
  DROP POLICY IF EXISTS "Users can insert their own account data" ON account_data;
  DROP POLICY IF EXISTS "Users can update their own account data" ON account_data;
  
  -- Drop watchlist policies if they exist
  DROP POLICY IF EXISTS "Users can view their own watchlist" ON watchlist;
  DROP POLICY IF EXISTS "Users can insert into their own watchlist" ON watchlist;
  DROP POLICY IF EXISTS "Users can update their own watchlist" ON watchlist;
  DROP POLICY IF EXISTS "Users can delete from their own watchlist" ON watchlist;
EXCEPTION
  WHEN undefined_object THEN
    -- Policies don't exist yet, continue
    NULL;
  WHEN undefined_table THEN
    -- Tables don't exist yet, continue
    NULL;
END $$;

-- Create account_data table
CREATE TABLE IF NOT EXISTS account_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_type text NOT NULL DEFAULT 'paper',
  equity numeric DEFAULT 0,
  buying_power numeric DEFAULT 0,
  day_trade_count integer DEFAULT 0,
  portfolio_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on account_data
ALTER TABLE account_data ENABLE ROW LEVEL SECURITY;

-- Create policies for account_data
CREATE POLICY "Users can view their own account data"
  ON account_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account data"
  ON account_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account data"
  ON account_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text,
  price numeric,
  change_percent numeric,
  added_at timestamptz DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'watchlist_user_id_symbol_key' 
    AND conrelid = 'watchlist'::regclass
  ) THEN
    ALTER TABLE watchlist ADD CONSTRAINT watchlist_user_id_symbol_key UNIQUE(user_id, symbol);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Table doesn't exist yet, constraint will be added with table creation
    NULL;
END $$;

-- Enable RLS on watchlist
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Create policies for watchlist
CREATE POLICY "Users can view their own watchlist"
  ON watchlist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own watchlist"
  ON watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
  ON watchlist
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON watchlist
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_data_user_id ON account_data(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);