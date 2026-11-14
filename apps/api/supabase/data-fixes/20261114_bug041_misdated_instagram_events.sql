-- One-off data fix, applied by hand (not a migration): BUG-041, events read
-- from Instagram posts and dated months or years after the post.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-11-14; nothing has
-- run it. Run it on staging first.
--
-- Why: until 912737f the importer read a caption's "25.4" relative to the
-- day it scraped, and rolled any date already past a year forward, so an
-- April post about 25 April became an event on 25 April next year. The
-- Apify flow kept whatever date the model read, such as "May 30th" as 2029.
-- Both now drop a start more than 60 days after the post
-- (src/scrape/shared/event-date-guard.ts).
--
-- Found read-only on 2026-10-25: 97 events from the April–May 2026 import
-- (scraper NULL, created 2026-04-30..05-08) dated 2026-11-01 to 2030-04-30,
-- and 10 from the Apify Instagram scraper (scraper 'instagram', created
-- 2026-08-19..09-11) dated 2027-08-14 to 2029-08-19. Database reads are off
-- for the AI now, so this file can't list the rows by id. It selects them by
-- those facts instead: active, from one of those two imports, and starting
-- more than 60 days after the row was created, which is the rule the import
-- now applies. Step 1 shows exactly which rows that is.
--
-- The fix unpublishes them (status 'draft'): they leave the app, and the
-- rows stay. Nothing is deleted, and step 4 undoes it. Events from GoOut and
-- the other scrapers are left alone; step 3 lists the ones that start far
-- ahead, for you to decide.

-- ── 1. Review: the rows step 2 will unpublish ─────────────────────────────
-- 107 rows matched on 25 Oct; expect a few fewer, since the earliest dates
-- (from 1 Nov) have passed and past events are left as they are.

SELECT e.id, e.scraper, e.created_at, e.start_date_time, e.title, v.name AS venue
FROM public.events e
LEFT JOIN public.venues v ON v.id = e.venue_id
WHERE e.status = 'active'
  AND e.start_date_time >= now() AT TIME ZONE 'utc'
  AND e.start_date_time >= (e.created_at AT TIME ZONE 'utc') + interval '60 days'
  AND (
    (e.scraper IS NULL
      AND e.created_at >= '2026-04-30 00:00+00'
      AND e.created_at < '2026-05-09 00:00+00')
    OR e.scraper = 'instagram'
  )
ORDER BY e.scraper NULLS FIRST, e.start_date_time;

-- ── 2. Unpublish them ──────────────────────────────────────────────────────
-- The same selection, frozen first. Each row is changed only if its id and
-- start are still the ones frozen and it's still active. If the count isn't
-- between 1 and 150, nothing changes and the block raises an error.

BEGIN;

CREATE TEMP TABLE bug041_misdated ON COMMIT DROP AS
SELECT e.id, e.start_date_time
FROM public.events e
WHERE e.status = 'active'
  AND e.start_date_time >= now() AT TIME ZONE 'utc'
  AND e.start_date_time >= (e.created_at AT TIME ZONE 'utc') + interval '60 days'
  AND (
    (e.scraper IS NULL
      AND e.created_at >= '2026-04-30 00:00+00'
      AND e.created_at < '2026-05-09 00:00+00')
    OR e.scraper = 'instagram'
  );

DO $$
DECLARE
  frozen integer;
  changed integer;
BEGIN
  SELECT count(*) INTO frozen FROM bug041_misdated;
  IF frozen NOT BETWEEN 1 AND 150 THEN
    RAISE EXCEPTION 'BUG-041: % rows selected, expected 1–150; nothing changed', frozen;
  END IF;

  UPDATE public.events e
  SET status = 'draft', updated_at = now()
  FROM bug041_misdated m
  WHERE e.id = m.id
    AND e.start_date_time = m.start_date_time
    AND e.status = 'active';
  GET DIAGNOSTICS changed = ROW_COUNT;

  RAISE NOTICE 'BUG-041: % of % rows unpublished', changed, frozen;
END $$;

COMMIT;

-- Check: GET /events/active (or this query) lists none of them any more.
-- SELECT count(*) FROM public.events
-- WHERE status = 'active'
--   AND start_date_time >= (created_at AT TIME ZONE 'utc') + interval '60 days'
--   AND (scraper IS NULL OR scraper = 'instagram');   -- expect 0

-- ── 3. For you to decide: other active events far ahead ───────────────────
-- Not changed by this file. The three GoOut events dated 2027 (Osees,
-- De/vision Redux, Союз) looked like real early announcements on 25 Oct.

SELECT e.id, e.scraper, e.created_at, e.start_date_time, e.title, v.name AS venue
FROM public.events e
LEFT JOIN public.venues v ON v.id = e.venue_id
WHERE e.status = 'active'
  AND e.start_date_time >= (e.created_at AT TIME ZONE 'utc') + interval '60 days'
  AND NOT (
    (e.scraper IS NULL
      AND e.created_at >= '2026-04-30 00:00+00'
      AND e.created_at < '2026-05-09 00:00+00')
    OR e.scraper IS NOT DISTINCT FROM 'instagram'
  )
ORDER BY e.start_date_time;

-- ── 4. Undo, if needed ─────────────────────────────────────────────────────
-- Republishes the rows step 2 unpublished: drafts from those imports whose
-- updated_at is the time step 2 ran. Put that time in place of the
-- placeholder first; as written it fails.
--
-- UPDATE public.events
-- SET status = 'active', updated_at = now()
-- WHERE status = 'draft'
--   AND updated_at = 'YYYY-MM-DD HH:MM:SS.ffffff+00'
--   AND (scraper IS NULL OR scraper = 'instagram');
