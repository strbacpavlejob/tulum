-- One-off data fix, applied by hand (not a migration): GuestList venue coordinates.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-10-24 from read-only lookups; nothing has run it.
--
-- Why: GuestListSerbiaScraperService took a venue's point only from the page's Google Maps link.
-- These pages link a maps.app.goo.gl short link or a text search, neither of which has coordinates
-- in it, so GeocoderService.extractCoordinates fell back to Belgrade's centre, 44.8125, 20.4612.
-- Eight venues sit on that one point; seven of them have upcoming events and stack on the map.
-- The pages do publish the venue's exact point in their JSON-LD (location.geo), which the fixed
-- scraper now reads first. The values below are those JSON-LD points, so the next scrape writes
-- the same coordinates and doesn't move them again. Tri Šešira is no longer on the site and comes
-- from OpenStreetMap.
--
-- Section B fixes Gradska Kafana, a separate case found on the way: the scraper took the map
-- centre (@...) of its Google Maps URL instead of the place pin (!3d...!4d...), 1.26 km away.
--
-- Each UPDATE matches the venue's id AND the coordinates it has now, so a row that has changed
-- since 2026-10-24 is left alone, and running the file twice changes nothing.
-- Expected: 9 rows updated (UPDATE 1 nine times). The SELECT at the end shows the result.
--
-- Cross-checks: OSM = OpenStreetMap through Nominatim/Overpass, Google = where the page's maps
-- link points. Distances are from the value used.

BEGIN;

-- ── A. Venues on the Belgrade-centre fallback point ─────────────────────────────

-- Tradicija, Tadeuša Košćuška 63 (Dorćol)
--   OSM restaurant "Tradicija" 44.8303219, 20.4556840: 26 m. Google 44.830467, 20.455928: 9 m.
UPDATE public.venues
SET latitude = 44.830528846765596, longitude = 20.455850339708338, updated_at = now()
WHERE id = 'db6b7d72-0c25-4ba8-a354-8b9b6b9028b5'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- Sipaj, Ne Pitaj, Bulevar vojvode Mišića 11, below Mostarska petlja
--   OSM has neither the venue nor house number 11. Nearest OSM addresses on the boulevard:
--   no. 15 (Radisson Old Mill) 78 m, no. 17 (BIGZ) 87 m. Only source: the page's JSON-LD.
UPDATE public.venues
SET latitude = 44.79775, longitude = 20.44685, updated_at = now()
WHERE id = 'be617241-1924-436b-b23b-c667c5bad453'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- Freestyler Winterstage, Bulevar vojvode Bojovića 30, Beton Hala
--   OSM Beton hala (Concrete Hall) 44.8198646, 20.4484311: 92 m.
--   Google "Freestyler Winter Stage" 44.8202939, 20.4483599: 139 m, and OSM no. 30: 128 m.
--   All are in the Beton hala complex. The page's point is the one the scraper will keep writing;
--   Google's pin matches the street address better, if you prefer that one.
UPDATE public.venues
SET latitude = 44.819062, longitude = 20.448688, updated_at = now()
WHERE id = '128cc9ff-c858-4227-bfad-6ccce624cbb7'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- Lasta Club, Karađorđeva 2-4, Beton Hala (its winter location, per the page)
--   OSM Beton hala (Concrete Hall) 44.8198646, 20.4484311: 19 m. (OSM's "Lasta" nightclub on the
--   river bank, the summer raft, is 884 m away.)
UPDATE public.venues
SET latitude = 44.81981240445303, longitude = 20.448203297326483, updated_at = now()
WHERE id = '15ad31c3-6e45-4a1f-a153-58c612a9bad5'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- HYPE, Karađorđeva 46, Savamala
--   Same point as OSM nightclub "Hype". OSM address Karađorđeva 46: 15 m.
UPDATE public.venues
SET latitude = 44.8137936, longitude = 20.4513368, updated_at = now()
WHERE id = '55067f56-2a46-4750-91b7-598300538b48'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- The Bank, Crnogorska 12 (Savamala)
--   Google "The BANK Club" 44.8146909, 20.4516833: 7 m. OSM address Crnogorska 12: 9 m.
UPDATE public.venues
SET latitude = 44.81474834854568, longitude = 20.45170009733233, updated_at = now()
WHERE id = 'd6c88c3d-c0bd-4daa-a7ba-5f41a7f05934'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- Boutique 3, Milutina Milankovića 1z (New Belgrade)
--   OSM restaurant "Boutique Trojka" ("trojka" = three) at no. 1ž, Navigator Business Center:
--   17 m. OSM has 1ž but no 1z there; the page writes 1z.
UPDATE public.venues
SET latitude = 44.806657603015736, longitude = 20.422478083824753, updated_at = now()
WHERE id = 'c34f0200-01ea-43d0-9a2b-9f2e53f608c0'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- Tri Šešira, Skadarska 29 (Skadarlija). No upcoming events, so it isn't on the map today.
--   Not on guestlist-serbia.com any more. OSM restaurant "Tri šešira", Skadarska 29.
UPDATE public.venues
SET latitude = 44.8181486, longitude = 20.4646161, updated_at = now()
WHERE id = '133d69d2-6d7d-447f-b7b0-ff4e0f4876d6'
  AND latitude = 44.8125 AND longitude = 20.4612;

-- ── B. Gradska Kafana: map centre stored instead of the place pin ───────────────

-- Gradska Kafana, Dragana Jeftića 10 (New Belgrade). Stored 44.8181541, 20.4518584 is 1.26 km off.
--   Google place pin (!3d!4d) used. OSM nightclub "Gradska Kafana Beograd" 13 m, OSM no. 10 55 m.
UPDATE public.venues
SET latitude = 44.8113363, longitude = 20.4391007, updated_at = now()
WHERE id = '1e381992-8aa0-4e2b-a0cc-55309bb4a187'
  AND latitude = 44.8181541 AND longitude = 20.4518584;

COMMIT;

-- Check: nine rows with their new points, and fallback_left = 0.
SELECT name, latitude, longitude, updated_at,
       (SELECT count(*) FROM public.venues WHERE latitude = 44.8125 AND longitude = 20.4612) AS fallback_left
FROM public.venues
WHERE id IN (
  'db6b7d72-0c25-4ba8-a354-8b9b6b9028b5',
  'be617241-1924-436b-b23b-c667c5bad453',
  '128cc9ff-c858-4227-bfad-6ccce624cbb7',
  '15ad31c3-6e45-4a1f-a153-58c612a9bad5',
  '55067f56-2a46-4750-91b7-598300538b48',
  'd6c88c3d-c0bd-4daa-a7ba-5f41a7f05934',
  'c34f0200-01ea-43d0-9a2b-9f2e53f608c0',
  '133d69d2-6d7d-447f-b7b0-ff4e0f4876d6',
  '1e381992-8aa0-4e2b-a0cc-55309bb4a187'
)
ORDER BY name;
