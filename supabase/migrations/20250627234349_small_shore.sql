/*
  # Create missing tables for automation bot

  1. New Tables
    - `account_data` - Store account information for trading bot
    - `watchlist` - Store user watchlist symbols
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

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

ALTER TABLE account_data ENABLE ROW LEVEL SECURITY;

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
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

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