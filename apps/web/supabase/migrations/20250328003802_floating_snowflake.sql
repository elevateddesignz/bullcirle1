/*
  # Fix Peer Feed Function

  1. Changes
    - Fix ambiguous column reference in get_peer_feed function
    - Qualify all table references
    - Add proper aliases to avoid ambiguity

  2. Security
    - Maintain existing RLS policies
    - Keep security definer setting
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_peer_feed(uuid);

-- Recreate function with fixed column references
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
    SELECT pc.peer_id AS id
    FROM peer_connections pc
    WHERE pc.user_id = user_uuid AND pc.status = 'accepted'
    UNION
    SELECT pc.user_id AS id
    FROM peer_connections pc
    WHERE pc.peer_id = user_uuid AND pc.status = 'accepted'
  )
  SELECT 
    f.id,
    f.user_id,
    p.username,
    p.avatar_url as avatar,
    f.content,
    f.likes,
    f.comments,
    f.created_at,
    CASE WHEN peers.id IS NOT NULL THEN true ELSE false END as is_peer
  FROM feed f
  JOIN profiles p ON f.user_id = p.id
  LEFT JOIN peers ON f.user_id = peers.id
  WHERE f.user_id = user_uuid OR peers.id IS NOT NULL
  ORDER BY f.created_at DESC;
END;
$$;