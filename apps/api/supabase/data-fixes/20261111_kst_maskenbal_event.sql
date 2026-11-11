-- One-off data fix, applied by hand (not a migration): the KST Maskenbal event.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-11-11; nothing has run it.
--
-- Run 20261111_kst_venue.sql first, so the venue has its real point and capacity.
--
-- Before running, EDIT the four values marked EDIT in params below. The start and end are Belgrade local
-- time. The INSERT turns them into UTC wall time, which is what events.start_date_time and end_date_time
-- hold (timestamp without time zone, read as UTC by the API; see apps/api/src/common/db-timestamp.ts).
-- Until the dates are filled in they aren't valid timestamps, so the file stops with an error and changes
-- nothing.
--
-- The event is created active, with no picture (the app shows its placeholder). Add a poster later from the
-- host dashboard or by setting picture_url.
--
-- Expected: INSERT 0 1, returning the event's id. That id goes into the QR codes:
--   https://mobile.tulum-app.com/e/<id>
-- Running the file again with the same values inserts nothing (same venue, title and start).

BEGIN;

WITH params AS (
  SELECT
    'KST Maskenbal'::text AS title,                                    -- EDIT: the name guests know
    'Maskenbal u KST-u. Skeniraj QR kod, pridruži se i upoznaj ljude na žurci.'::text
      AS description,                                                  -- EDIT: one or two sentences
    'YYYY-MM-DD 22:00'::timestamp AS starts_belgrade,                  -- EDIT: doors open, Belgrade time
    'YYYY-MM-DD 05:00'::timestamp AS ends_belgrade                     -- EDIT: closing, Belgrade time
),
event_times AS (
  SELECT
    p.*,
    (p.starts_belgrade AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC' AS starts_utc,
    (p.ends_belgrade AT TIME ZONE 'Europe/Belgrade') AT TIME ZONE 'UTC' AS ends_utc
  FROM params p
)
INSERT INTO public.events (title, description, start_date_time, end_date_time, venue_id, status, tags)
SELECT t.title, t.description, t.starts_utc, t.ends_utc,
       '7582f9e7-23cc-43d7-bfd5-ddf4d578edae', 'active', ARRAY['Maskenbal', 'KST', 'Žurka']
FROM event_times t
WHERE t.ends_utc > t.starts_utc
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.venue_id = '7582f9e7-23cc-43d7-bfd5-ddf4d578edae'
      AND e.title = t.title
      AND e.start_date_time = t.starts_utc
  )
RETURNING id, title, start_date_time AS starts_utc, end_date_time AS ends_utc;

COMMIT;

-- Check: the event with its Belgrade times, as guests will see them.
SELECT e.id, e.title, e.status,
       (e.start_date_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Belgrade' AS starts_belgrade,
       (e.end_date_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Belgrade' AS ends_belgrade,
       v.name AS venue, v.latitude, v.longitude, v.capacity
FROM public.events e
JOIN public.venues v ON v.id = e.venue_id
WHERE e.venue_id = '7582f9e7-23cc-43d7-bfd5-ddf4d578edae'
ORDER BY e.start_date_time DESC;
