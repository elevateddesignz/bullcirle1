/*
  # Add Peer Connections and Feed Updates

  1. New Tables
    - `peer_connections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `peer_id` (uuid, references profiles)
      - `status` (text) - connection status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add function to get peer feed
    - Update feed policies

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create peer_connections table
CREATE TABLE peer_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  peer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, peer_id)
);

-- Enable RLS
ALTER TABLE peer_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for peer_connections
CREATE POLICY "Users can create their own connections"
  ON peer_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own connections"
  ON peer_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = peer_id);

CREATE POLICY "Users can update their own connections"
  ON peer_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = peer_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = peer_id);

-- Create function to get peer feed
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
    SELECT peer_id AS id
    FROM peer_connections
    WHERE user_id = user_uuid AND status = 'accepted'
    UNION
    SELECT user_id AS id
    FROM peer_connections
    WHERE peer_id = user_uuid AND status = 'accepted'
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