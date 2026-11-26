-- Migration: one history of the events Tulum's Instagram has promoted, in
-- Stories and in feed posts, so that no event is promoted twice.
--
-- social_media_publications: a row per event a story or a feed post shows.
-- A run adds its events' rows (status 'publishing') before it publishes, so
-- two runs can't take the same event: the unique key on (event_id,
-- platform) lets an event be promoted once per platform, in a story or in a
-- feed post. Once Instagram confirms the post, the run marks its rows
-- 'published' with the media id. If Instagram refused it, the run deletes
-- them, and the events can be promoted later. If Instagram gave no clear
-- answer, they stay 'unknown': the post may be on the account, so the
-- events are not promoted again. Rows go with their event (ON DELETE
-- CASCADE); the history matters only while an event can still be promoted.
--
-- The API works before this is applied: the weekly posts go out as before,
-- without the history, and the Stories don't go out. The table follows
-- 20261020070215_private_tables_service_role_only.sql: RLS on with no
-- policies, and only the service role (the API) has grants. Since
-- 2026-10-30 Supabase gives new tables no default grants, so they are
-- granted here. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.social_media_publications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  platform text NOT NULL,
  format text NOT NULL,
  status text NOT NULL DEFAULT 'publishing',
  -- The run that published it, e.g. story:2026-11-27T10:00:mih3k2 or
  -- feed:2026-11-30:week:mih3k2.
  run_key text NOT NULL,
  media_id text,
  permalink text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT social_media_publications_pkey PRIMARY KEY (id),
  CONSTRAINT social_media_publications_event_id_fkey FOREIGN KEY (event_id)
    REFERENCES public.events (id) ON DELETE CASCADE,
  -- Its index leads with event_id, so it serves the foreign key too.
  CONSTRAINT social_media_publications_event_platform_key
    UNIQUE (event_id, platform),
  CONSTRAINT social_media_publications_platform_check
    CHECK (platform IN ('instagram')),
  CONSTRAINT social_media_publications_format_check
    CHECK (format IN ('story', 'feed')),
  CONSTRAINT social_media_publications_status_check
    CHECK (status IN ('publishing', 'published', 'unknown')),
  CONSTRAINT social_media_publications_published_check
    CHECK (
      status <> 'published'
      OR (media_id IS NOT NULL AND published_at IS NOT NULL)
    ),
  CONSTRAINT social_media_publications_run_key_length_check
    CHECK (char_length(run_key) <= 100),
  CONSTRAINT social_media_publications_error_length_check
    CHECK (char_length(error) <= 1000)
);

-- The Stories look up the last day's stories, for their venues.
CREATE INDEX IF NOT EXISTS social_media_publications_recent_idx
  ON public.social_media_publications
  USING btree (platform, format, created_at DESC);

ALTER TABLE public.social_media_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.social_media_publications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.social_media_publications TO service_role;

COMMIT;

-- Check after applying:
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.social_media_publications'::regclass
-- ORDER BY conname;                                  -- expect 9 rows
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema = 'public'
--   AND table_name = 'social_media_publications';
--                    -- expect service_role SELECT, INSERT, UPDATE, DELETE
--
-- What was promoted, newest first:
-- SELECT p.created_at, p.format, p.status, e.title, p.permalink
-- FROM public.social_media_publications p
-- JOIN public.events e ON e.id = p.event_id
-- ORDER BY p.created_at DESC LIMIT 50;
--
-- To undo: DROP TABLE IF EXISTS public.social_media_publications;
