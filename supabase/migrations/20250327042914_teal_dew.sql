/*
  # Update waitlist table policies

  1. Changes
    - Remove authentication requirement for inserting into waitlist
    - Add policy for public inserts
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Edge functions can insert into waitlist" ON waitlist;
DROP POLICY IF EXISTS "Edge functions can read waitlist" ON waitlist;

-- Create new policy for public inserts
CREATE POLICY "Allow public inserts into waitlist"
  ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy for authenticated reads
CREATE POLICY "Authenticated users can read waitlist"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (true);