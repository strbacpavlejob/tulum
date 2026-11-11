-- One-off data fix, applied by hand (not a migration): the KST venue, for the KST Maskenbal launch.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-11-11 from read-only lookups; nothing has run it.
--
-- Why: Tulum launches at KST Maskenbal. The venue "Klub Studenata Tehnike KST"
-- (7582f9e7-23cc-43d7-bfd5-ddf4d578edae) came from the Instagram scraper on 2026-04-30 with the point
-- 0,0, its own name as the address, type bar and capacity 100.
--   - At 0,0 nobody at the club passes the Matches location check (300 m from the venue's point).
--   - The event page shows "N spots left" as capacity minus going, and "Event is full" from then on,
--     so with capacity 100 the Maskenbal page would say full after the 100th guest.
--
-- A. The point: OSM's point for Bulevar kralja Aleksandra 73, the technical faculties' building where KST is.
--    Same values and guard as KST's entry in 20261024_instagram_venue_coordinates.sql, so running both
--    files, in either order, is harmless.
-- B. Address, type and capacity. Capacity is the expected Maskenbal crowd; edit 5000 if you expect another
--    number. The UPDATE matches the values the row has now, so a row edited since 2026-11-11 is left alone.
--
-- Expected: UPDATE 1 for A (UPDATE 0 if the Instagram fix already ran), UPDATE 1 for B.
-- Running the file twice changes nothing more.

BEGIN;

-- ── A. Point ─────────────────────────────────────────────────────────────────────
UPDATE public.venues
SET latitude = 44.8058905, longitude = 20.4758334, updated_at = now()
WHERE id = '7582f9e7-23cc-43d7-bfd5-ddf4d578edae' AND latitude = 0 AND longitude = 0;

-- ── B. Address, type and capacity ───────────────────────────────────────────────
UPDATE public.venues
SET address = 'Bulevar kralja Aleksandra 73, Beograd',
    venue_type = 'club',
    capacity = 5000,
    updated_at = now()
WHERE id = '7582f9e7-23cc-43d7-bfd5-ddf4d578edae'
  AND address = 'Klub Studenata Tehnike KST'
  AND venue_type = 'bar'
  AND capacity = 100;

COMMIT;

-- Check: expect 44.8058905, 20.4758334, the new address, club, 5000.
SELECT id, name, address, venue_type, capacity, latitude, longitude, updated_at
FROM public.venues
WHERE id = '7582f9e7-23cc-43d7-bfd5-ddf4d578edae';
