-- Migration: Change picture_urls array to picture_url single optional string for venues
-- Date: 2026-03-13
-- Description: Update venues table to use single picture_url instead of picture_urls array

-- Step 0: Clear all existing pictures from venues
UPDATE public.venues 
SET picture_urls = '{}';

-- Step 1: Add new picture_url column (optional)
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS picture_url TEXT;

-- Step 2: Drop old picture_urls column (no migration needed since we cleared all data)
ALTER TABLE public.venues 
DROP COLUMN IF EXISTS picture_urls;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_venues_picture_url 
ON public.venues(picture_url) 
WHERE picture_url IS NOT NULL;

-- Note: This migration is compatible with the new venue image storage system
-- that stores single images in the 'venue-images' Supabase storage bucket
-- All existing picture URLs have been cleared and venues can now have new images uploaded
