/*
  # Fix account_data and watchlist tables

  1. New Tables
    - Ensures account_data and watchlist tables exist
    - Adds proper foreign key constraints
    - Creates appropriate indexes
  
  2. Security
    - Enables RLS on both tables
    - Adds policies for user data access
*/

-- Create account_data table if it doesn't exist
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

-- Enable RLS if not already enabled
ALTER TABLE account_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_data' AND policyname = 'Users can view their own account data') THEN
    DROP POLICY "Users can view their own account data" ON account_data;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_data' AND policyname = 'Users can insert their own account data') THEN
    DROP POLICY "Users can insert their own account data" ON account_data;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_data' AND policyname = 'Users can update their own account data') THEN
    DROP POLICY "Users can update their own account data" ON account_data;
  END IF;
END $$;

-- Create policies
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

-- Create watchlist table if it doesn't exist
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  name text,
  price numeric,
  change_percent numeric,
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Enable RLS if not already enabled
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DO $$ 
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'watchlist' AND policyname = 'Users can view their own watchlist') THEN
    DROP POLICY "Users can view their own watchlist" ON watchlist;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'watchlist' AND policyname = 'Users can insert into their own watchlist') THEN
    DROP POLICY "Users can insert into their own watchlist" ON watchlist;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'watchlist' AND policyname = 'Users can update their own watchlist') THEN
    DROP POLICY "Users can update their own watchlist" ON watchlist;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'watchlist' AND policyname = 'Users can delete from their own watchlist') THEN
    DROP POLICY "Users can delete from their own watchlist" ON watchlist;
  END IF;
END $$;

-- Create policies
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

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_account_data_user_id ON account_data(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);