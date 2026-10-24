-- Migration: one active event session per guest and event (QA BUG-030).
-- The app checks in on every load of the Matches tab, and POST
-- /events/sessions inserted a new row each time, so a reload left a second
-- active session. The swipe path then failed to read the session and refused
-- swipes with 'Both users must be at the same live event'. The API now
-- returns the open session instead of inserting another. This makes the
-- database refuse a second one too, including when two check-ins race.
--
-- First, later duplicates of an active session are deleted, keeping each
-- guest's earliest active session per event. Nothing closes a session
-- (exited_at stays NULL), so a duplicate adds nothing the first doesn't, and
-- no table references event_sessions.id. Then the plain partial index on the
-- same columns becomes a unique one, under the same name. Safe to re-run.

BEGIN;

DELETE FROM public.event_sessions later
USING public.event_sessions earlier
WHERE later.exited_at IS NULL
  AND earlier.exited_at IS NULL
  AND earlier.user_id = later.user_id
  AND earlier.event_id = later.event_id
  AND (earlier.entered_at, earlier.id) < (later.entered_at, later.id);

DROP INDEX IF EXISTS public.event_sessions_active_idx;
CREATE UNIQUE INDEX event_sessions_active_idx
  ON public.event_sessions USING btree (event_id, user_id)
  WHERE (exited_at IS NULL);

COMMIT;

-- Check after applying; expect CREATE UNIQUE INDEX event_sessions_active_idx …:
-- SELECT indexdef FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname = 'event_sessions_active_idx';
-- And expect 0 guests with more than one active session at an event:
-- SELECT count(*) FROM (
--   SELECT 1 FROM public.event_sessions WHERE exited_at IS NULL
--   GROUP BY user_id, event_id HAVING count(*) > 1
-- ) duplicates;
