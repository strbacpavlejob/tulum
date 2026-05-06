-- Migration: Change picture_urls array to picture_url single optional string
-- Date: 2026-03-11
-- Description: Update events table to use single picture_url instead of picture_urls array

-- Step 0: Clear all existing pictures from events
UPDATE public.events 
SET picture_urls = '{}';

-- Step 1: Add new picture_url column (optional)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Step 2: Drop old picture_urls column (no migration needed since we cleared all data)
ALTER TABLE public.events 
DROP COLUMN IF EXISTS picture_urls;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_picture_url 
ON public.events(picture_url) 
WHERE picture_url IS NOT NULL;

-- Note: This migration is compatible with the new event image storage system
-- that stores single images in the 'event-images' Supabase storage bucket
-- All existing picture URLs have been cleared and events can now have new images uploaded


-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Migration: Change picture_urls array to picture_url single optional string
-- Date: 2026-03-11
-- Description: Update events table to use single picture_url instead of picture_urls array

-- Step 0: Clear all existing pictures from events
UPDATE public.events 
SET picture_urls = '{}';

-- Step 1: Add new picture_url column (optional)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Step 2: Drop old picture_urls column (no migration needed since we cleared all data)
ALTER TABLE public.events 
DROP COLUMN IF EXISTS picture_urls;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_picture_url 
ON public.events(picture_url) 
WHERE picture_url IS NOT NULL;

-- Note: This migration is compatible with the new event image storage system
-- that stores single images in the 'event-images' Supabase storage bucket
-- All existing picture URLs have been cleared and events can now have new images uploaded


-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Add public read policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');