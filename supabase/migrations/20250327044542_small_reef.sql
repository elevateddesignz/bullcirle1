/*
  # Fix User Subscriptions Relationship

  1. Changes
    - Drop existing user_subscriptions table
    - Recreate user_subscriptions table with proper foreign key relationship
    - Update RLS policies
    - Reinsert default subscriptions for existing users

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing user_subscriptions table if it exists
DROP TABLE IF EXISTS user_subscriptions;

-- Recreate user_subscriptions table with proper foreign key relationship
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create default subscriptions for existing users
INSERT INTO user_subscriptions (
  user_id,
  tier_id,
  status,
  current_period_start,
  current_period_end
)
SELECT 
  p.id as user_id,
  t.id as tier_id,
  'active' as status,
  now() as current_period_start,
  (now() + interval '100 years') as current_period_end
FROM profiles p
CROSS JOIN subscription_tiers t
WHERE t.name = 'Free'
AND NOT EXISTS (
  SELECT 1 FROM user_subscriptions us 
  WHERE us.user_id = p.id
);