/*
  # Fix peer feed function and add missing columns

  1. Changes
    - Drop existing function
    - Create improved version with proper column references
    - Add proper table aliases to avoid ambiguity
    - Add proper JOIN conditions

  2. Security
    - Maintain existing RLS policies
    - Keep security definer setting
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_peer_feed(uuid);

-- Create improved version of get_peer_feed function
CREATE OR REPLACE FUNCTION get_peer_feed(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  avatar text,
  content text,
  likes integer,
  comments integer,
  created_at timestamptz,
  is_peer boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH peers AS (
    -- Get all accepted peer connections for the user
    SELECT DISTINCT
      CASE 
        WHEN pc.user_id = user_uuid THEN pc.peer_id
        WHEN pc.peer_id = user_uuid THEN pc.user_id
      END AS peer_id
    FROM peer_connections pc
    WHERE (pc.user_id = user_uuid OR pc.peer_id = user_uuid)
      AND pc.status = 'accepted'
  )
  SELECT DISTINCT
    f.id,
    f.user_id,
    p.username,
    p.avatar_url as avatar,
    f.content,
    f.likes,
    f.comments,
    f.created_at,
    COALESCE(peers.peer_id IS NOT NULL, false) as is_peer
  FROM feed f
  JOIN profiles p ON p.id = f.user_id
  LEFT JOIN peers ON peers.peer_id = f.user_id
  WHERE f.user_id = user_uuid  -- Include user's own posts
     OR peers.peer_id IS NOT NULL  -- Include posts from peers
  ORDER BY f.created_at DESC;
END;
$$;