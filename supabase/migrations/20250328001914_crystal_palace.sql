/*
  # Add Social Feed Table

  1. New Tables
    - `feed`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `likes` (integer)
      - `comments` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Create their own posts
      - View all posts
      - Update their own posts
*/

-- Create feed table
CREATE TABLE feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE feed ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own posts"
  ON feed
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view posts"
  ON feed
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own posts"
  ON feed
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to get feed with user info
CREATE OR REPLACE FUNCTION get_feed()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  avatar text,
  content text,
  likes integer,
  comments integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.user_id,
    p.username,
    p.avatar_url as avatar,
    f.content,
    f.likes,
    f.comments,
    f.created_at
  FROM feed f
  JOIN profiles p ON f.user_id = p.id
  ORDER BY f.created_at DESC;
END;
$$;