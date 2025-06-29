/*
  # Fix User Registration

  1. Changes
    - Add metadata handling for user registration
    - Add missing profile fields
    - Update user creation trigger

  2. Security
    - Maintain existing RLS policies
    - Ensure secure handling of user data
*/

-- Create a profiles table to store additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create an improved handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id
  );

  -- Insert free tier subscription
  INSERT INTO user_subscriptions (
    user_id,
    tier_id,
    status,
    current_period_start,
    current_period_end
  )
  SELECT
    NEW.id,
    t.id,
    'active',
    now(),
    (now() + interval '100 years')
  FROM subscription_tiers t
  WHERE t.name = 'Free'
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();