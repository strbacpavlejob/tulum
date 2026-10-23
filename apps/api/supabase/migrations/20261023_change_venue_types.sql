
BEGIN;

-- 1. Create new enum
CREATE TYPE public.venue_type_enum_new AS ENUM (
    'bar',
    'club',
    'restaurant',
    'cafe',
    'tavern',
    'event_venue'
);

-- 2. Convert existing venue categories
ALTER TABLE public.venues
ALTER COLUMN venue_type TYPE public.venue_type_enum_new
USING (
    CASE venue_type::text
        WHEN 'bar' THEN 'bar'
        WHEN 'pub' THEN 'bar'
        WHEN 'cocktail_bar' THEN 'bar'
        WHEN 'wine_bar' THEN 'bar'
        WHEN 'brewery' THEN 'bar'

        WHEN 'nightclub' THEN 'club'
        WHEN 'raft' THEN 'club'

        WHEN 'restaurant' THEN 'restaurant'
        WHEN 'tavern' THEN 'tavern'
        WHEN 'cafe' THEN 'cafe'
    END
)::public.venue_type_enum_new;

-- 3. Remove old enum
DROP TYPE public.venue_type_enum;

-- 4. Rename new enum
ALTER TYPE public.venue_type_enum_new
RENAME TO venue_type_enum;

COMMIT;

-- 5. Verify
SELECT venue_type, COUNT(*)
FROM public.venues
GROUP BY venue_type
ORDER BY venue_type;
