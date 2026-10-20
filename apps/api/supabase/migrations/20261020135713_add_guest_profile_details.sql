-- Migration: columns for the profile details guests edit on the Profile tab
-- (QA BUG-010). Work, education, height and the lifestyle fields had no
-- column, so the app kept them only in memory and a reload lost them.
-- PATCH /users/me is the only writer. It checks each value against the
-- choices the app offers (apps/api/src/users/dto/update-my-profile.dto.ts),
-- so the single-choice columns are plain text, like interests and
-- venue_types. guests keeps RLS on with no policies, so anon and
-- authenticated still see no rows. Safe to re-run.

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS work text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS height_cm smallint
    CONSTRAINT guests_height_cm_check CHECK (height_cm BETWEEN 50 AND 300),
  ADD COLUMN IF NOT EXISTS has_children text,
  ADD COLUMN IF NOT EXISTS drinking text,
  ADD COLUMN IF NOT EXISTS smoking text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS relationship_status text,
  ADD COLUMN IF NOT EXISTS sexuality text,
  ADD COLUMN IF NOT EXISTS star_sign text,
  ADD COLUMN IF NOT EXISTS pets text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS religion text;

-- Check after applying; expect 12 rows:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'guests'
--   AND column_name IN ('work', 'education', 'height_cm', 'has_children',
--                       'drinking', 'smoking', 'languages',
--                       'relationship_status', 'sexuality', 'star_sign',
--                       'pets', 'religion')
-- ORDER BY column_name;
