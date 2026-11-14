-- Migration: the report queue for moderators (Maskenbal batch 5, plan item
-- N-21).
--
-- Guests report each other from a profile or a chat (guest_reports, from
-- 20261025103255_guest_safety_controls.sql), and admins review reports on
-- the host's /reports page. For the ball's moderators these two views answer
-- the questions of a busy night in the SQL editor, as
-- docs/moderation-runbook.md describes:
--
-- moderation.report_queue: open reports (pending or in review), most urgent
--   first. priority 1 is underage and unsafe meetings, 2 harassment, 3 the
--   rest; within a priority, guests with more open reports come first, then
--   the oldest report.
-- moderation.reported_guests: one row per reported guest: their reports,
--   how many are open, how many different guests reported them, the
--   reasons, and their visibility (hidden means already hidden).
--
-- They live in their own schema, which the Data API doesn't expose. Only
-- postgres (the SQL editor) and service_role can read them, so reporters'
-- and reported guests' details can't leak through the API. They read as the
-- caller (security_invoker). Nothing here changes any data. Safe to re-run.

BEGIN;

CREATE SCHEMA IF NOT EXISTS moderation;
REVOKE ALL ON SCHEMA moderation FROM PUBLIC;
GRANT USAGE ON SCHEMA moderation TO service_role;

CREATE OR REPLACE VIEW moderation.report_queue
WITH (security_invoker = true) AS
SELECT
  CASE
    WHEN r.reason IN ('underage', 'unsafe_meeting') THEN 1
    WHEN r.reason = 'harassment' THEN 2
    ELSE 3
  END AS priority,
  r.id AS report_id,
  r.created_at,
  r.status,
  r.reason,
  r.source,
  r.details,
  r.reported_user_id,
  nullif(concat_ws(' ', reported.first_name, reported.last_name), '')
    AS reported_name,
  reported.email AS reported_email,
  g.visibility AS reported_visibility,
  open_reports.count AS reported_open_reports,
  r.reporter_id,
  nullif(concat_ws(' ', reporter.first_name, reporter.last_name), '')
    AS reporter_name,
  e.title AS event_title,
  r.match_id,
  -- From a chat: its last messages when it was reported.
  r.messages
FROM public.guest_reports r
LEFT JOIN public.users reported ON reported.id = r.reported_user_id
LEFT JOIN public.guests g ON g.user_id = r.reported_user_id
LEFT JOIN public.users reporter ON reporter.id = r.reporter_id
LEFT JOIN public.events e ON e.id = r.event_id
LEFT JOIN LATERAL (
  SELECT count(*) AS count
  FROM public.guest_reports o
  WHERE o.reported_user_id = r.reported_user_id
    AND o.status IN ('pending', 'in_review')
) open_reports ON true
WHERE r.status IN ('pending', 'in_review')
ORDER BY priority, reported_open_reports DESC, r.created_at;

CREATE OR REPLACE VIEW moderation.reported_guests
WITH (security_invoker = true) AS
SELECT
  r.reported_user_id AS user_id,
  nullif(concat_ws(' ', u.first_name, u.last_name), '') AS name,
  u.email,
  g.visibility,
  count(*) AS reports,
  count(*) FILTER (WHERE r.status IN ('pending', 'in_review'))
    AS open_reports,
  count(DISTINCT r.reporter_id) AS different_reporters,
  array_agg(DISTINCT r.reason) AS reasons,
  max(r.created_at) AS last_reported_at
FROM public.guest_reports r
LEFT JOIN public.users u ON u.id = r.reported_user_id
LEFT JOIN public.guests g ON g.user_id = r.reported_user_id
WHERE r.reported_user_id IS NOT NULL
GROUP BY r.reported_user_id, u.first_name, u.last_name, u.email, g.visibility
ORDER BY open_reports DESC, last_reported_at DESC;

REVOKE ALL ON moderation.report_queue, moderation.reported_guests
  FROM PUBLIC;
GRANT SELECT ON moderation.report_queue, moderation.reported_guests
  TO service_role;

COMMIT;

-- Check after applying, in the SQL editor:
-- SELECT * FROM moderation.report_queue LIMIT 20;
-- SELECT * FROM moderation.reported_guests LIMIT 20;
-- And that the API's roles can't see them (expect false, false):
-- SELECT has_schema_privilege('anon', 'moderation', 'USAGE'),
--        has_schema_privilege('authenticated', 'moderation', 'USAGE');
