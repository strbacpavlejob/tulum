-- Migration: a column for the Default Venue Type the Profile tab's Settings
-- offers (QA BUG-029). It had no column, so the app kept the choice only in
-- memory and a reload lost it. PATCH /settings/me is the only writer, and it
-- accepts only the venue types (apps/api/src/settings/dto/
-- update-my-settings.dto.ts). It uses the venues' own enum. NULL means no
-- choice, shown as 'Not set'. settings keeps RLS on with no policies, and
-- service_role's table grants cover the new column. Safe to re-run.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS default_venue_type public.venue_type_enum;

-- Check after applying; expect one row (venue_type_enum, YES):
-- SELECT column_name, udt_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'settings'
--   AND column_name = 'default_venue_type';
