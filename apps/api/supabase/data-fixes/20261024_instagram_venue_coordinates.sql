-- One-off data fix, applied by hand (not a migration): Instagram venues stored at 0,0.
-- Project: tulum-demo (zebnwuzwezfzinvletji). Written 2026-10-24 from read-only lookups; nothing has run it.
--
-- Why: InstagramVenueScraperService.geocodeAddress() returned 0,0 whenever Nominatim found nothing.
-- When a profile had no street address, the venue's name was geocoded instead ("Pakao Klub,
-- Belgrade, Serbia"), so 48 venues created 2026-04-30..05-08 sit at 0,0, which the map draws off the
-- coast of Africa. The code now refuses to build a venue it can't locate.
--
-- This file moves the 20 rows whose location is backed by the venue's own data (bio or stored
-- address, a handle that is an address) or an OpenStreetMap POI of the same name. The other 28
-- rows stay at 0,0 and are listed at the end. Twelve of them aren't places at all.
--
-- Each UPDATE matches the id AND the current point, so a row changed since 2026-10-24 is left alone.
-- Expected: 22 rows updated (20 in A and B, 2 in the optional section C). The SELECT at the end
-- shows them.
--
-- OSM = OpenStreetMap through Nominatim/Overpass. "bio" = the Instagram bio stored in
-- venues.description.

BEGIN;

-- ── A. Real venues, located ────────────────────────────────────────────────────

-- Pričica Coffee Bar. Bio: "Karađorđeva 36, Savski Venac". OSM cafe "Pričica" at Karađorđeva 36.
-- Its only event (2027-04-24) is an April 2026 post with a misread date.
UPDATE public.venues SET latitude = 44.8146332, longitude = 20.4508272, updated_at = now()
WHERE id = '81e5b655-ffe5-4ded-8e14-b0afc3a8a336' AND latitude = 0 AND longitude = 0;

-- Svemirski Ranččč by Infinity Lighthouse. Stored address Žorža Klemansoa 29g; bio: part of
-- Gastrošor. OSM address point 29g, Port of Belgrade.
-- Its event is the only 0,0 pin in today's 10-day window: a May 2026 Formula 1 post dated 2026-11-01.
UPDATE public.venues SET latitude = 44.8252835, longitude = 20.4708785, updated_at = now()
WHERE id = 'b779fd69-8abf-44da-8fe6-07baa8b0434c' AND latitude = 0 AND longitude = 0;

-- UMAMI | Cocktail bar. Stored address Žorža Klemensoa 29b. OSM restaurant "Umami" (4 m from 29b).
UPDATE public.venues SET latitude = 44.8254612, longitude = 20.4703765, updated_at = now()
WHERE id = 'ba26e628-b5d0-4823-aa03-88f7d2094161' AND latitude = 0 AND longitude = 0;

-- In Smoke We Trust BBQ. Bio: "Žorža Klemansoa 29a". OSM restaurant "In Smoke We Trust".
UPDATE public.venues SET latitude = 44.8248606, longitude = 20.4711439, updated_at = now()
WHERE id = 'c7cb709e-db79-4d76-b8da-dc659dec7d06' AND latitude = 0 AND longitude = 0;

-- tannin_winebistro_gastrosor. OSM restaurant "Tannin Wine Bistro", Žorža Klemansoa 27v.
UPDATE public.venues SET latitude = 44.8249161, longitude = 20.4706306, updated_at = now()
WHERE id = '6c63daf5-20b9-4de9-a61f-36d7c15c15df' AND latitude = 0 AND longitude = 0;

-- Anti Shop Elektropionir. Bio: "Cetinjska 15". OSM nightclub "Elektropionir", Cetinjska 15.
UPDATE public.venues SET latitude = 44.8180145, longitude = 20.4655284, updated_at = now()
WHERE id = '7e9696b1-cfea-4c65-aadf-f90848e79851' AND latitude = 0 AND longitude = 0;

-- "Art space in Belgrade, Serbia" = Kvaka 22 (handle kvaka22_catch22). OSM bar "Kvaka 22".
-- Its 2 events (2027-04) are April 2026 posts with misread dates.
UPDATE public.venues SET latitude = 44.8089060, longitude = 20.4831375, updated_at = now()
WHERE id = 'cfd18c01-98db-4c42-b881-4626552bb021' AND latitude = 0 AND longitude = 0;

-- D O K Lounge. Bio: "Karadjordjeva 55". OSM address point 55 (it's a boat, moored by that address).
UPDATE public.venues SET latitude = 44.8138644, longitude = 20.4517420, updated_at = now()
WHERE id = 'd0aef34e-58e8-4ca5-9c13-e8c6bb39bb4c' AND latitude = 0 AND longitude = 0;

-- Dear Darling... Bio: "Kralja Petra 45". OSM address point 45.
UPDATE public.venues SET latitude = 44.8205865, longitude = 20.4557641, updated_at = now()
WHERE id = 'ab5f7995-fb2d-4e5a-9294-ed67f77d1199' AND latitude = 0 AND longitude = 0;

-- Elizabeth Bristol. Bio: "Located at The Bristol Hotel". OSM hotel Bristol, Karađorđeva 50.
UPDATE public.venues SET latitude = 44.8127512, longitude = 20.4526281, updated_at = now()
WHERE id = '3fe202ed-6e38-4dc3-b1a6-6a1b505ff51d' AND latitude = 0 AND longitude = 0;

-- Hollywoodland Aqua Park. Centre of the OSM water park area "Hollywoodland Aquapark".
UPDATE public.venues SET latitude = 44.8007221, longitude = 20.3438632, updated_at = now()
WHERE id = '107d32f6-a9b0-4e94-8a5c-c56deb9d81f7' AND latitude = 0 AND longitude = 0;

-- Klub Studenata Tehnike KST. Its bio has no address. KST's long-standing address is Bulevar kralja
-- Aleksandra 73, the technical faculties' building; this is OSM's point for no. 73.
UPDATE public.venues SET latitude = 44.8058905, longitude = 20.4758334, updated_at = now()
WHERE id = '7582f9e7-23cc-43d7-bfd5-ddf4d578edae' AND latitude = 0 AND longitude = 0;

-- klub20_44. OSM nightclub "20/44" (Savamala riverside; 33 m from HYPE, so the markers don't overlap).
UPDATE public.venues SET latitude = 44.8140798, longitude = 20.4512438, updated_at = now()
WHERE id = 'b5fd5b07-2b86-488e-859d-13674c763ffe' AND latitude = 0 AND longitude = 0;

-- Nula pet _0.5. Bio: "Dobračina 30a, Stari grad". OSM pub "0.5" (3 m from 30a).
UPDATE public.venues SET latitude = 44.8193120, longitude = 20.4624931, updated_at = now()
WHERE id = '6d141cca-11a2-44ca-b8c5-9222dfc28f50' AND latitude = 0 AND longitude = 0;

-- RADIONICA BAR. Bio: "Dobračina 59b". OSM arts centre "Dorćol Platz" at 59b.
UPDATE public.venues SET latitude = 44.8233363, longitude = 20.4669818, updated_at = now()
WHERE id = '254352c5-15f0-4e01-8fab-82c9f66aba61' AND latitude = 0 AND longitude = 0;

-- Restoran ,,Reka'' Zemun. Bio: "Kej Oslobodjenja 73b, Zemun". OSM restaurant "Река" at 73b.
UPDATE public.venues SET latitude = 44.8491255, longitude = 20.4113373, updated_at = now()
WHERE id = 'e3e9dbb4-8a64-4c01-b08c-07348dbfa880' AND latitude = 0 AND longitude = 0;

-- hilandarska28. No bio; the handle is the address. OSM address point Hilandarska 28.
UPDATE public.venues SET latitude = 44.8150215, longitude = 20.4690194, updated_at = now()
WHERE id = '54c376ff-dcae-4791-b6da-99383e06633d' AND latitude = 0 AND longitude = 0;

-- La Bocca. Bio: "Caffe na Vračaru. Cerska 5A". OSM address point Cerska 5a in Čubura (Vračar).
-- (Nominatim's first hit for "Cerska 5a" is a different Cerska street, in Leštane.)
UPDATE public.venues SET latitude = 44.7963992, longitude = 20.4781870, updated_at = now()
WHERE id = 'd4568c17-4637-4bc9-a11b-82a35c446bd5' AND latitude = 0 AND longitude = 0;

-- ── B. Duplicates of venues that already have a point (same Instagram handle) ───
-- No events on either copy. Merging or deleting the duplicate is the cleaner fix; this only takes
-- them off 0,0.

-- kuglasbg = "Kuglaš" (Đušina 5), whose point is OSM's address point for Đušina 5.
UPDATE public.venues SET latitude = 44.8128492, longitude = 20.4738738, updated_at = now()
WHERE id = '7d92793f-22f1-4850-9e70-3227f53dd472' AND latitude = 0 AND longitude = 0;

-- zendwich_bar = "Zendwich" (stored at the Cetinjska 15 address point). OSM fast food "Zendwich"
-- is used here, 26 m away, so it doesn't sit on Anti Shop Elektropionir's point above.
UPDATE public.venues SET latitude = 44.8179445, longitude = 20.4652163, updated_at = now()
WHERE id = '6604fcb6-b4f6-48b7-9026-6d1a6e48be76' AND latitude = 0 AND longitude = 0;

-- ── C. Optional: Instagram venues stored in Warsaw (same geocoder, not 0,0) ─────

-- Funk and Soul Gastro, stored address Francuska 6. Stored 52.2322052, 21.0558047 is Warsaw.
-- OSM pub "Funk & Soul" at Francuska 6, Belgrade.
UPDATE public.venues SET latitude = 44.8175838, longitude = 20.4628174, updated_at = now()
WHERE id = 'fbe3f7cd-ab9c-45ae-80cb-62a17424e5fb' AND latitude = 52.2322052 AND longitude = 21.0558047;

-- Shakó Lounge Bar | Belgrade, stored address Francuska 17. Stored 52.2336603, 21.0541207 is Warsaw.
-- OSM address point Francuska 17, Belgrade.
UPDATE public.venues SET latitude = 44.8182533, longitude = 20.4630962, updated_at = now()
WHERE id = '3fe88778-c595-4d92-862b-8fe9928216d0' AND latitude = 52.2336603 AND longitude = 21.0541207;

COMMIT;

-- Check: the 22 rows with their new points, and how many Instagram venues are still at 0,0 (expect 28).
SELECT name, latitude, longitude, updated_at,
       (SELECT count(*) FROM public.venues WHERE scraper = 'instagram' AND latitude = 0 AND longitude = 0) AS instagram_at_zero
FROM public.venues
WHERE id IN (
  '81e5b655-ffe5-4ded-8e14-b0afc3a8a336', 'b779fd69-8abf-44da-8fe6-07baa8b0434c',
  'ba26e628-b5d0-4823-aa03-88f7d2094161', 'c7cb709e-db79-4d76-b8da-dc659dec7d06',
  '6c63daf5-20b9-4de9-a61f-36d7c15c15df', '7e9696b1-cfea-4c65-aadf-f90848e79851',
  'cfd18c01-98db-4c42-b881-4626552bb021', 'd0aef34e-58e8-4ca5-9c13-e8c6bb39bb4c',
  'ab5f7995-fb2d-4e5a-9294-ed67f77d1199', '3fe202ed-6e38-4dc3-b1a6-6a1b505ff51d',
  '107d32f6-a9b0-4e94-8a5c-c56deb9d81f7', '7582f9e7-23cc-43d7-bfd5-ddf4d578edae',
  'b5fd5b07-2b86-488e-859d-13674c763ffe', '6d141cca-11a2-44ca-b8c5-9222dfc28f50',
  '254352c5-15f0-4e01-8fab-82c9f66aba61', 'e3e9dbb4-8a64-4c01-b08c-07348dbfa880',
  '54c376ff-dcae-4791-b6da-99383e06633d', 'd4568c17-4637-4bc9-a11b-82a35c446bd5',
  '7d92793f-22f1-4850-9e70-3227f53dd472', '6604fcb6-b4f6-48b7-9026-6d1a6e48be76',
  'fbe3f7cd-ab9c-45ae-80cb-62a17424e5fb', '3fe88778-c595-4d92-862b-8fe9928216d0'
)
ORDER BY name;

-- ── Left at 0,0 (28 rows), for you to decide ───────────────────────────────────
--
-- Not places: promoters, event series and a media account. Their bios point at other venues.
-- Delete them, or move their events to the host venue:
--   GUŽVA® (2 events, both "📍@vinyl.belgrade"), HajdeDa Events® (Mama Shelter),
--   Skijam. (Mama Shelter), СУБОТАРЕЊЕ ☀️ SUBOTARENJE (Umami, Gastrošor),
--   Niko Nikom Ne Jebe Mater Morning Session (Srbolek), Now in Belgrade (city guide),
--   CoffeeParty.rs (1 event), ФОМО (1 event), Jurka™ (Open Air Corner), BLNDR (Open Air Corner),
--   Inner Groove (1 event, at 20/44), Da Ti Šapnem (a one-off "corner of Savska and Sarajevska").
--
-- Real venues with no location in their data, OSM or a web search:
--   Vinyl Nightclub Belgrade (6 events), Pakao Klub (3 events), Para klub Beograd (2 events),
--   BARŽA ("Savski nasip", no number), Beton Club & Event Center, Kafana Druga Kuca Gaucosi,
--   KÚMA Lounge bar ("Ada Ciganlija, Makiška strana, lokal 12"), Mint Lounge Bar ("Relje Krilatice 1",
--   not in OSM), peronbarbelgrade, Port by Community ("Usce bb"), 8bar.belgrade,
--   Žar Plus ("Bulevar Mihajla Pupina 38": OSM only has the street),
--   Chernyi Cooperative Coffee Roasters (bio: "Dorćol, Closed"),
--   Bašta Bar (bio: "Branka Djonlića bb, Bogatić", a town outside Belgrade),
--   moneyclubbelgrade (probably the Money club already stored at Beton hala),
--   Splav Leto (probably the guest-list "Leto" venue).
--
-- Every upcoming event on these rows is an April-May 2026 post whose date the old extractor misread
-- (2026-11-01 to 2030-04-30). Only the Svemirski Ranččč one (2026-11-01) is inside today's window.
