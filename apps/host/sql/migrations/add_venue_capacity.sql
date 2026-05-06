-- Migration: Add capacity column to venues table
-- Date: 2026-03-09
-- Description: Adds an optional capacity field to the venues table

-- Add capacity column to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS capacity integer;

-- Add comment
COMMENT ON COLUMN public.venues.capacity IS 'Maximum capacity of the venue';
