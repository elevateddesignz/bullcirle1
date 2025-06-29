/*
  # User Tiers Implementation

  1. New Tables
    - `subscription_tiers`
      - `id` (uuid, primary key)
      - `name` (text) - tier name (e.g., 'free', 'pro')
      - `price` (numeric) - monthly price
      - `features` (jsonb) - list of features
      - `created_at` (timestamptz)
    
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - references auth.users
      - `tier_id` (uuid) - references subscription_tiers
      - `status` (text) - subscription status
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create subscription tiers table
CREATE TABLE subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL,
  features jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  tier_id uuid REFERENCES subscription_tiers NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_tiers
CREATE POLICY "Anyone can view subscription tiers"
  ON subscription_tiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default tiers
INSERT INTO subscription_tiers (name, price, features) VALUES
  ('Free', 0, '{
    "features": [
      "Basic market data",
      "Limited trades per month",
      "Community access",
      "Basic charts",
      "Paper trading"
    ],
    "limits": {
      "trades_per_month": 10,
      "watchlist_items": 5,
      "real_time_quotes": false,
      "advanced_charts": false,
      "api_access": false
    }
  }'::jsonb),
  ('Pro', 29.99, '{
    "features": [
      "Real-time market data",
      "Unlimited trades",
      "Priority support",
      "Advanced charts",
      "API access",
      "Extended trading hours",
      "Premium research tools",
      "Options trading"
    ],
    "limits": {
      "trades_per_month": -1,
      "watchlist_items": -1,
      "real_time_quotes": true,
      "advanced_charts": true,
      "api_access": true
    }
  }'::jsonb);

-- Function to automatically create free tier subscription for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
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

-- Trigger to create free subscription for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();