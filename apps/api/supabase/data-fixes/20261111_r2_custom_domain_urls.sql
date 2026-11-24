-- One-off data fix, applied by hand (not a migration): stored image URLs move from r2.dev to the bucket's
-- custom domain.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-11-11 from read-only counts. Applied 2026-11-24:
-- afterwards venues 172, events 103 and guest photos 13 were on img.tulum-app.com and 0 left on r2.dev.
--
-- Why: images were served from https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev, which Cloudflare calls
-- non-production and rate-limits ("hundreds of requests/second", then 429s). Rows store the full URL, so
-- after the bucket gets a custom domain they keep loading from r2.dev until they are rewritten.
-- Only the host changes; the key (the path) stays the same, so no object moves.
--
-- Order:
--   1. Connect the custom domain to the bucket in Cloudflare and check that an existing image loads on it,
--      for example https://img.tulum-app.com/<key of any venue picture>.
--   2. On Railway set R2_PUBLIC_URL to the new domain and R2_LEGACY_PUBLIC_URLS to the r2.dev address, and
--      redeploy. New uploads then get the new URL, and deleting an image still works for rows that hold the
--      old one (R2Service.extractKeyFromUrl reads both).
--   3. Run this file. EDIT both addresses in each statement if your domain isn't img.tulum-app.com.
--
-- Each statement names the two addresses itself, so the file runs the same whether the SQL editor runs it
-- as one transaction or statement by statement. (The first version kept them in a temporary table, which
-- the Supabase SQL editor dropped between statements: "relation r2_bases does not exist".) It only touches
-- URLs that still start with the old address, so running it again changes nothing.
--
-- Counts on 2026-11-11: venues.picture_url 172, events.picture_url 103, guests.picture_urls 13 photos held
-- by 7 guests, users.avatar_url 0. Expected: UPDATE 172, UPDATE 103, UPDATE 7, UPDATE 0. More is fine if
-- rows were added since; the check at the end expects 0 left.

WITH b(old_base, new_base) AS (
  VALUES ('https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev/', 'https://img.tulum-app.com/')
)
UPDATE public.venues v
SET picture_url = b.new_base || substr(v.picture_url, length(b.old_base) + 1), updated_at = now()
FROM b
WHERE starts_with(v.picture_url, b.old_base);

WITH b(old_base, new_base) AS (
  VALUES ('https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev/', 'https://img.tulum-app.com/')
)
UPDATE public.events e
SET picture_url = b.new_base || substr(e.picture_url, length(b.old_base) + 1), updated_at = now()
FROM b
WHERE starts_with(e.picture_url, b.old_base);

-- Keeps the photos' order; URLs on other hosts stay as they are.
WITH b(old_base, new_base) AS (
  VALUES ('https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev/', 'https://img.tulum-app.com/')
)
UPDATE public.guests g
SET picture_urls = ARRAY(
  SELECT CASE
           WHEN starts_with(u.url, b.old_base) THEN b.new_base || substr(u.url, length(b.old_base) + 1)
           ELSE u.url
         END
  FROM unnest(g.picture_urls) WITH ORDINALITY AS u(url, position)
  ORDER BY u.position
)
FROM b
WHERE EXISTS (SELECT 1 FROM unnest(g.picture_urls) AS p(url) WHERE starts_with(p.url, b.old_base));

WITH b(old_base, new_base) AS (
  VALUES ('https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev/', 'https://img.tulum-app.com/')
)
UPDATE public.users usr
SET avatar_url = b.new_base || substr(usr.avatar_url, length(b.old_base) + 1), updated_at = now()
FROM b
WHERE starts_with(usr.avatar_url, b.old_base);

-- Check: expect 0 URLs left on r2.dev in every column.
SELECT
  (SELECT count(*) FROM public.venues WHERE picture_url LIKE '%.r2.dev/%') AS venues_left,
  (SELECT count(*) FROM public.events WHERE picture_url LIKE '%.r2.dev/%') AS events_left,
  (SELECT count(*) FROM public.guests, unnest(picture_urls) AS u(url) WHERE u.url LIKE '%.r2.dev/%') AS guest_photos_left,
  (SELECT count(*) FROM public.users WHERE avatar_url LIKE '%.r2.dev/%') AS avatars_left;
