-- Load test likes, on the STAGING project only, after the first k6 run (its
-- setup signs the load users in, onboards them and checks them in).
--
-- One seeded guest in ten (load_guest_0010, 0020, ...) likes every load
-- user. About one like in ten from a load user then makes a match, with its
-- chat and a push to both inboxes, as on a busy night; without this only
-- the pairs the script makes match. Safe to re-run. Like the seed, it
-- refuses a database that has events of its own.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events
    WHERE id <> 'b6b6b6b6-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Load test likes: this database has other events, so it is not the empty staging project (see loadtest/README.md)';
  END IF;
END $$;

INSERT INTO public.guest_swipes
  (swiper_user_id, swiped_user_id, event_id, liked)
SELECT seeded.user_id, load_user.user_id,
       'b6b6b6b6-0000-4000-8000-000000000001', true
FROM public.guests seeded
CROSS JOIN public.guests load_user
JOIN public.users u ON u.id = load_user.user_id
WHERE seeded.user_id LIKE 'load\_guest\_%0'
  AND u.email LIKE 'load-%+clerk\_test@example.com'
ON CONFLICT (swiper_user_id, swiped_user_id, event_id) DO NOTHING;

COMMIT;

-- Check: expect 200 times the number of load users (20000 for 100).
-- SELECT count(*) FROM public.guest_swipes
-- WHERE event_id = 'b6b6b6b6-0000-4000-8000-000000000001'
--   AND swiper_user_id LIKE 'load\_guest\_%';
