-- Migration: keep every account, and the right to contact it (Maskenbal
-- batch 5, plan item N-18).
--
-- 1. marketing_consents: guests' answers to "Email me when the Tulum app is
--    out", one row per answer, from onboarding or Settings. A change adds a
--    row instead of editing one, so every answer keeps the wording the guest
--    saw, the app's language, the phone type and the time. The latest row is
--    the guest's current answer. Rows go with the account (ON DELETE
--    CASCADE). The API only reads and adds rows.
-- 2. guests.signup_platform, first_event_id and first_source: where a guest
--    came from. The platform they signed up on (web-ios, web-android-
--    instagram, ...), the first event they joined, and the QR poster that
--    brought them (?src=p07). The API writes each once and never overwrites
--    it.
-- 3. matches.archived_at: the admin clean-up archives matches instead of
--    deleting them with their chats and messages. An archived match leaves
--    the guests' inboxes and stays in the database.
--
-- The API works before this is applied: it skips recording consent and
-- attribution (and Settings hides the email switch), and the clean-up
-- refuses to run. The new table follows
-- 20261020070215_private_tables_service_role_only.sql: RLS on with no
-- policies, and only the service role (the API) has grants. Since
-- 2026-10-30 Supabase gives new tables no default grants, so they are
-- granted here. Safe to re-run.

BEGIN;

-- 1. Consent log.
CREATE TABLE IF NOT EXISTS public.marketing_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  topic text NOT NULL,
  granted boolean NOT NULL,
  wording text NOT NULL,
  language text,
  platform text,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_consents_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_consents_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT marketing_consents_topic_check CHECK (topic IN ('app_launch')),
  CONSTRAINT marketing_consents_source_check
    CHECK (source IN ('onboarding', 'settings')),
  CONSTRAINT marketing_consents_wording_length_check
    CHECK (char_length(wording) <= 500),
  CONSTRAINT marketing_consents_language_length_check
    CHECK (char_length(language) <= 8),
  CONSTRAINT marketing_consents_platform_length_check
    CHECK (char_length(platform) <= 64)
);

-- The latest answer per guest, and the user_id foreign key.
CREATE INDEX IF NOT EXISTS marketing_consents_user_topic_created_idx
  ON public.marketing_consents USING btree (user_id, topic, created_at DESC);

ALTER TABLE public.marketing_consents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.marketing_consents FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.marketing_consents TO service_role;

-- 2. Attribution. Adding nullable columns doesn't rewrite the table.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS signup_platform text,
  ADD COLUMN IF NOT EXISTS first_event_id uuid,
  ADD COLUMN IF NOT EXISTS first_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass
      AND conname = 'guests_first_event_id_fkey'
  ) THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_first_event_id_fkey FOREIGN KEY (first_event_id)
        REFERENCES public.events (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass
      AND conname = 'guests_signup_platform_length_check'
  ) THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_signup_platform_length_check
        CHECK (char_length(signup_platform) <= 64);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass
      AND conname = 'guests_first_source_length_check'
  ) THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_first_source_length_check
        CHECK (char_length(first_source) <= 32);
  END IF;
END $$;

-- The new foreign key gets its index, as 20261114152119 gave the others.
CREATE INDEX IF NOT EXISTS guests_first_event_id_idx
  ON public.guests USING btree (first_event_id);

-- 3. Archived matches.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMIT;

-- Check after applying:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (table_name, column_name) IN (
--     ('guests', 'signup_platform'), ('guests', 'first_event_id'),
--     ('guests', 'first_source'), ('matches', 'archived_at')
--   );                                             -- expect 4 rows
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = 'marketing_consents';
--                                  -- expect service_role SELECT and INSERT
--
-- The consent list after the ball (each guest's latest answer):
-- SELECT DISTINCT ON (c.user_id) u.email, u.first_name, c.granted,
--        c.created_at, c.language, c.platform
-- FROM public.marketing_consents c
-- JOIN public.users u ON u.id = c.user_id
-- WHERE c.topic = 'app_launch'
-- ORDER BY c.user_id, c.created_at DESC;   -- then keep the granted rows
