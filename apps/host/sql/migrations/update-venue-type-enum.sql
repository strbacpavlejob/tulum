-- Migration: Update venue_type_enum to support all new venue types
-- This script updates the existing venue_type_enum with new values

-- Step 1: Create a new temporary enum with all the venue types
CREATE TYPE public.venue_type_enum_new AS ENUM (
    'bar',
    'pub',
    'nightclub',
    'restaurant',
    'cafe',
    'cocktail_bar',
    'wine_bar',
    'brewery',
    'tavern',
    'raft'
);

-- Step 2: Alter the venues table to use the new enum type
-- First, convert the column to text temporarily
ALTER TABLE public.venues 
    ALTER COLUMN venue_type TYPE text;

-- Step 3: Update any old values to new values if needed
-- Map old values to new values (adjust as needed based on your data)
UPDATE public.venues 
SET venue_type = CASE 
    WHEN venue_type = 'club' THEN 'nightclub'
    ELSE venue_type
END;

-- Step 4: Drop the old enum type
DROP TYPE IF EXISTS public.venue_type_enum CASCADE;

-- Step 5: Rename the new enum to the original name
ALTER TYPE public.venue_type_enum_new RENAME TO venue_type_enum;

-- Step 6: Convert the column back to the enum type
ALTER TABLE public.venues 
    ALTER COLUMN venue_type TYPE public.venue_type_enum 
    USING venue_type::public.venue_type_enum;

-- Verify the changes
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'public.venue_type_enum'::regtype
ORDER BY enumsortorder;
