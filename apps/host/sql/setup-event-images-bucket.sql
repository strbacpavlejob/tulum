-- Complete setup for event-images storage bucket
-- Run this in Supabase SQL Editor

-- Step 1: Create the bucket (public access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true, -- Public bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for event images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own event images" ON storage.objects;

-- Step 3: Create new policies for event-images bucket
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Users can delete their own event images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Step 4: Verify bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'event-images';

-- Step 5: Verify policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%event images%';
