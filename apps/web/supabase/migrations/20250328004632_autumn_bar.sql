/*
  # Add Circles and Circle Membership Tables

  1. New Tables
    - `circles`
      - Basic circle information (name, description, image, privacy)
      - Created by user reference
      - Settings and metadata
    
    - `circle_members`
      - Tracks circle membership
      - Member roles and permissions
      - Join date and status

    - `circle_posts`
      - Circle-specific posts/updates
      - Support for trade tags
      - Engagement metrics

    - `circle_watchlists`
      - Shared watchlists for circles
      - Symbol tracking
      - Notes and alerts

  2. Security
    - Enable RLS on all tables
    - Restrict access based on circle privacy and membership
*/

-- Create circles table
CREATE TABLE circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  image_url text,
  is_private boolean DEFAULT false,
  settings jsonb DEFAULT '{
    "allow_member_invites": true,
    "show_member_trades": true,
    "allow_trade_tags": true
  }'::jsonb,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create circle_members table
CREATE TABLE circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL CHECK (status IN ('invited', 'active', 'banned')),
  badges jsonb DEFAULT '[]'::jsonb,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(circle_id, user_id)
);

-- Create circle_posts table
CREATE TABLE circle_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('message', 'trade', 'resource')),
  metadata jsonb DEFAULT '{}'::jsonb,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create circle_watchlists table
CREATE TABLE circle_watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  notes text,
  alerts jsonb DEFAULT '[]'::jsonb,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(circle_id, symbol)
);

-- Enable RLS
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_watchlists ENABLE ROW LEVEL SECURITY;

-- Circles policies
CREATE POLICY "Anyone can view public circles"
  ON circles
  FOR SELECT
  TO authenticated
  USING (NOT is_private OR EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circles.id
    AND user_id = auth.uid()
    AND status = 'active'
  ));

CREATE POLICY "Users can create circles"
  ON circles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Circle owners and admins can update circles"
  ON circles
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circles.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circles.id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ));

-- Circle members policies
CREATE POLICY "Circle members can view other members"
  ON circle_members
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM circle_members cm
    WHERE cm.circle_id = circle_members.circle_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  ));

CREATE POLICY "Users can accept circle invites"
  ON circle_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'invited')
  WITH CHECK (user_id = auth.uid() AND status = 'active');

-- Circle posts policies
CREATE POLICY "Circle members can view posts"
  ON circle_posts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circle_posts.circle_id
    AND user_id = auth.uid()
    AND status = 'active'
  ));

CREATE POLICY "Circle members can create posts"
  ON circle_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circle_posts.circle_id
    AND user_id = auth.uid()
    AND status = 'active'
  ));

-- Circle watchlists policies
CREATE POLICY "Circle members can view watchlists"
  ON circle_watchlists
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circle_watchlists.circle_id
    AND user_id = auth.uid()
    AND status = 'active'
  ));

CREATE POLICY "Circle members can add to watchlists"
  ON circle_watchlists
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = circle_watchlists.circle_id
    AND user_id = auth.uid()
    AND status = 'active'
  ));

-- Function to get user's circles
CREATE OR REPLACE FUNCTION get_user_circles(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  image_url text,
  is_private boolean,
  member_count integer,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.image_url,
    c.is_private,
    c.member_count,
    cm.role,
    c.created_at
  FROM circles c
  JOIN circle_members cm ON c.id = cm.circle_id
  WHERE cm.user_id = user_uuid
  AND cm.status = 'active'
  ORDER BY c.created_at DESC;
END;
$$;