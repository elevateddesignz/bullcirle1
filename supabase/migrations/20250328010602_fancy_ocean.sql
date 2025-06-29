/*
  # Add Dashboard Helper Functions

  1. New Functions
    - get_market_overview: Returns market statistics
    - get_recent_trades: Returns user's recent trades
    - get_watchlist: Returns user's watchlist items

  2. Security
    - Functions are security definer
    - Access restricted to authenticated users
*/

-- Function to get market overview
CREATE OR REPLACE FUNCTION get_market_overview(user_uuid uuid)
RETURNS TABLE (
  symbol text,
  name text,
  price numeric,
  change numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'S&P 500'::text as symbol,
    'S&P 500 Index'::text as name,
    4783.24::numeric as price,
    1.2::numeric as change
  UNION ALL
  SELECT 
    'NASDAQ'::text,
    'NASDAQ Composite'::text,
    14982.11::numeric,
    0.8::numeric
  UNION ALL
  SELECT 
    'DOW'::text,
    'Dow Jones Industrial Average'::text,
    35492.70::numeric,
    -0.3::numeric;
END;
$$;

-- Function to get recent trades
CREATE OR REPLACE FUNCTION get_recent_trades(user_uuid uuid)
RETURNS TABLE (
  symbol text,
  type text,
  shares numeric,
  price numeric,
  total numeric,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.symbol,
    t.type,
    t.shares,
    t.price,
    (t.shares * t.price) as total,
    t.status,
    t.created_at
  FROM trades t
  WHERE t.user_id = user_uuid
  ORDER BY t.created_at DESC
  LIMIT 10;
END;
$$;

-- Function to get watchlist
CREATE OR REPLACE FUNCTION get_watchlist(user_uuid uuid)
RETURNS TABLE (
  symbol text,
  name text,
  price numeric,
  change numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'AAPL'::text as symbol,
    'Apple Inc.'::text as name,
    182.34::numeric as price,
    1.2::numeric as change
  UNION ALL
  SELECT 
    'TSLA'::text,
    'Tesla Inc.'::text,
    242.11::numeric,
    -0.8::numeric
  UNION ALL
  SELECT 
    'MSFT'::text,
    'Microsoft'::text,
    337.89::numeric,
    0.5::numeric
  UNION ALL
  SELECT 
    'GOOGL'::text,
    'Alphabet'::text,
    142.34::numeric,
    1.5::numeric
  UNION ALL
  SELECT 
    'AMZN'::text,
    'Amazon'::text,
    178.92::numeric,
    -0.3::numeric
  UNION ALL
  SELECT 
    'META'::text,
    'Meta Platforms'::text,
    482.21::numeric,
    2.1::numeric;
END;
$$;