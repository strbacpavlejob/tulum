-- One-off data fix, applied by hand (not a migration): stored image URLs move from r2.dev to the bucket's
-- custom domain.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-11-11 from read-only counts; nothing has run it.
--
-- Why: images are served from https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev, which Cloudflare calls
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
--   3. Run this file. EDIT new_base below if your domain isn't img.tulum-app.com.
--
-- Counts on 2026-11-11: venues.picture_url 172, events.picture_url 103, guests.picture_urls 13 photos held
-- by 7 guests, users.avatar_url 0. Expected: UPDATE 172, UPDATE 103, UPDATE 7, UPDATE 0. More is fine if
-- rows were added since; the check at the end expects 0 left.

BEGIN;

CREATE TEMP TABLE r2_bases ON COMMIT DROP AS
SELECT 'https://pub-d5cc44fe73934be18d2bb77b8de1b215.r2.dev/'::text AS old_base,
       'https://img.tulum-app.com/'::text AS new_base;                -- EDIT if the domain differs

UPDATE public.venues v
SET picture_url = b.new_base || substr(v.picture_url, length(b.old_base) + 1), updated_at = now()
FROM r2_bases b
WHERE starts_with(v.picture_url, b.old_base);

UPDATE public.events e
SET picture_url = b.new_base || substr(e.picture_url, length(b.old_base) + 1), updated_at = now()
FROM r2_bases b
WHERE starts_with(e.picture_url, b.old_base);

-- Keeps the photos' order; URLs on other hosts stay as they are.
UPDATE public.guests g
SET picture_urls = ARRAY(
  SELECT CASE
           WHEN starts_with(u.url, b.old_base) THEN b.new_base || substr(u.url, length(b.old_base) + 1)
           ELSE u.url
         END
  FROM unnest(g.picture_urls) WITH ORDINALITY AS u(url, position)
  ORDER BY u.position
)
FROM r2_bases b
WHERE EXISTS (SELECT 1 FROM unnest(g.picture_urls) AS p(url) WHERE starts_with(p.url, b.old_base));

UPDATE public.users usr
SET avatar_url = b.new_base || substr(usr.avatar_url, length(b.old_base) + 1), updated_at = now()
FROM r2_bases b
WHERE starts_with(usr.avatar_url, b.old_base);

COMMIT;

-- Check: expect 0 URLs left on r2.dev in every column.
SELECT
  (SELECT count(*) FROM public.venues WHERE picture_url LIKE '%.r2.dev/%') AS venues_left,
  (SELECT count(*) FROM public.events WHERE picture_url LIKE '%.r2.dev/%') AS events_left,
  (SELECT count(*) FROM public.guests, unnest(picture_urls) AS u(url) WHERE u.url LIKE '%.r2.dev/%') AS guest_photos_left,
  (SELECT count(*) FROM public.users WHERE avatar_url LIKE '%.r2.dev/%') AS avatars_left;
