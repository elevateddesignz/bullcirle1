/*
  # Fix waitlist table RLS policies

  1. Changes
    - Drop existing policies
    - Create new policy for public inserts with no restrictions
    - Create policy for authenticated reads
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public inserts into waitlist" ON waitlist;
DROP POLICY IF EXISTS "Authenticated users can read waitlist" ON waitlist;

-- Create new policy for public inserts with no restrictions
CREATE POLICY "Anyone can insert into waitlist"
  ON waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create policy for authenticated reads
CREATE POLICY "Authenticated users can read waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);