/*
  # Fix User Registration Trigger

  1. Changes
    - Update trigger to handle user metadata more reliably
    - Add error handling for profile creation
    - Ensure atomic operations

  2. Security
    - Maintain existing RLS policies
    - Ensure secure handling of user data
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  free_tier_id uuid;
BEGIN
  -- Get the free tier ID
  SELECT id INTO free_tier_id
  FROM subscription_tiers
  WHERE name = 'Free'
  LIMIT 1;

  -- Create profile with username from metadata
  INSERT INTO profiles (
    id,
    username,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'username')::text,
      split_part(NEW.email, '@', 1)
    ),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text,
    now(),
    now()
  );

  -- Create free subscription
  IF free_tier_id IS NOT NULL THEN
    INSERT INTO user_subscriptions (
      user_id,
      tier_id,
      status,
      current_period_start,
      current_period_end
    ) VALUES (
      NEW.id,
      free_tier_id,
      'active',
      now(),
      (now() + interval '100 years')
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle username conflict
    INSERT INTO profiles (
      id,
      username,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      split_part(NEW.email, '@', 1) || '_' || substring(NEW.id::text from 1 for 8),
      'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.id::text,
      now(),
      now()
    );
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in handle_new_user: %', SQLERRM;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();