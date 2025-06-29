/*
  # Add Storage Bucket Policies

  1. Changes
    - Create storage bucket policies for avatars
    - Allow authenticated users to manage their own avatars
    - Enable public read access for avatars

  2. Security
    - Restrict write access to authenticated users
    - Only allow users to modify their own avatars
    - Allow public read access for all avatars
*/

-- Create policies for the avatars storage bucket
BEGIN;

-- Enable RLS for the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for inserting avatars (authenticated users only)
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for updating avatars (users can only update their own)
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for deleting avatars (users can only delete their own)
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for reading avatars (public access)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Create the avatars bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

COMMIT;