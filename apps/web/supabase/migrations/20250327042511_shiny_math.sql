/*
  # Add waitlist table for email collection

  1. New Tables
    - `waitlist`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Allow inserts from edge functions
*/

CREATE TABLE waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to insert
CREATE POLICY "Edge functions can insert into waitlist"
  ON waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow edge functions to read waitlist
CREATE POLICY "Edge functions can read waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);