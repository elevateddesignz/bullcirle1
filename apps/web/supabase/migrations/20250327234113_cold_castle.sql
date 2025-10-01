/*
  # Add trades table for storing trade information

  1. New Tables
    - `trades`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references profiles(id)
      - `symbol` (text) - stock symbol
      - `type` (text) - buy or sell
      - `shares` (numeric) - number of shares
      - `price` (numeric) - price per share
      - `status` (text) - pending, completed, failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Create their own trades
      - Read their own trades
*/

-- Create trades table
CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL CHECK (type IN ('buy', 'sell')),
  shares numeric NOT NULL CHECK (shares > 0),
  price numeric NOT NULL CHECK (price > 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own trades"
  ON trades
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own trades"
  ON trades
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);