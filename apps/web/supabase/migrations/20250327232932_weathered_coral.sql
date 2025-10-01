/*
  # Add settings column to profiles table

  1. Changes
    - Add JSONB settings column to profiles table
    - Set default empty JSON object
    - Update RLS policies
*/

-- Add settings column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow updating settings
CREATE POLICY "Users can update their own settings"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);