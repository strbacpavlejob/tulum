-- Load test seed: a live event with 2,000 guests checked in, on the STAGING
-- project only (loadtest/README.md). Never run it on production.
--
-- It makes a host and a venue, the event "Load test night" (started an hour
-- ago, ends in 12 hours), and 2,000 guests (users load_guest_0001..2000,
-- with guest profiles, tickets and open check-ins), spread over the
-- genders, ages, interests and check-in times a real night has. They are
-- what the k6 users swipe through and see on the guest list; they never
-- sign in. Safe to re-run: existing rows are kept, and the event's times
-- move to now again.
--
-- It refuses a database that has events of its own, as production does;
-- the staging project starts with none.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events
    WHERE id <> 'b6b6b6b6-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Load test seed: this database has other events, so it is not the empty staging project (see loadtest/README.md)';
  END IF;
END $$;

-- The host and venue the event needs.
INSERT INTO public.users (id, email, username, first_name)
VALUES ('load_host', 'load-host@load.invalid', 'load_host', 'Load test host')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hosts (user_id) VALUES ('load_host')
ON CONFLICT DO NOTHING;

INSERT INTO public.venues
  (id, host_id, venue_type, name, latitude, longitude, address, capacity)
VALUES
  ('b6b6b6b6-0000-4000-8000-000000000002', 'load_host', 'club',
   'Load test venue', 44.8176, 20.4569, 'Staging only (load test)', 5000)
ON CONFLICT (id) DO NOTHING;

-- Times are UTC wall clock, as the events columns hold them.
INSERT INTO public.events
  (id, venue_id, title, description, start_date_time, end_date_time, tags,
   status)
VALUES
  ('b6b6b6b6-0000-4000-8000-000000000001',
   'b6b6b6b6-0000-4000-8000-000000000002',
   'Load test night', 'Seeded for the load test (loadtest/README.md).',
   (now() AT TIME ZONE 'utc') - interval '1 hour',
   (now() AT TIME ZONE 'utc') + interval '12 hours',
   '{Party}', 'active')
ON CONFLICT (id) DO UPDATE
SET start_date_time = EXCLUDED.start_date_time,
    end_date_time = EXCLUDED.end_date_time,
    status = 'active';

-- 2,000 guests.
INSERT INTO public.users (id, email, username, first_name)
SELECT
  format('load_guest_%s', lpad(g::text, 4, '0')),
  format('load-guest-%s@load.invalid', lpad(g::text, 4, '0')),
  format('load_guest_%s', lpad(g::text, 4, '0')),
  (ARRAY['Ana', 'Marko', 'Jelena', 'Luka', 'Mila', 'Nikola', 'Sara',
         'Stefan', 'Ivana', 'Petar'])[1 + g % 10]
FROM generate_series(1, 2000) AS g
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.guests
  (user_id, gender, seeking, interested_in, interests, picture_urls, birthday)
SELECT
  format('load_guest_%s', lpad(g::text, 4, '0')),
  (CASE WHEN g % 25 = 0 THEN 'other' WHEN g % 2 = 0 THEN 'female'
        ELSE 'male' END)::public.gender_enum,
  (ARRAY['casual', 'relationship', 'friendship', 'party'])[1 + g % 4]
    ::public.seeking_enum,
  (CASE WHEN g % 7 = 0 THEN ARRAY['male', 'female', 'other']
        WHEN g % 2 = 0 THEN ARRAY['male']
        ELSE ARRAY['female'] END)::public.gender_enum[],
  (ARRAY['{Music,Dancing}', '{Travel,Food}', '{Art,Coffee}',
         '{Fitness,Tech}'])[1 + g % 4]::text[],
  '{}',
  make_date(1984 + g % 20, 1 + g % 12, 1 + g % 28)
FROM generate_series(1, 2000) AS g
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.tickets (event_id, guest_id)
SELECT 'b6b6b6b6-0000-4000-8000-000000000001',
       format('load_guest_%s', lpad(g::text, 4, '0'))
FROM generate_series(1, 2000) AS g
ON CONFLICT (guest_id, event_id) DO NOTHING;

-- Checked in over the past hour, in waves, as a crowd arrives.
INSERT INTO public.event_sessions (user_id, event_id, ticket_id, entered_at)
SELECT t.guest_id, t.event_id, t.id,
       now() - (random() * interval '55 minutes')
FROM public.tickets t
WHERE t.event_id = 'b6b6b6b6-0000-4000-8000-000000000001'
  AND t.guest_id LIKE 'load\_guest\_%'
  AND NOT EXISTS (
    SELECT 1 FROM public.event_sessions s
    WHERE s.event_id = t.event_id
      AND s.user_id = t.guest_id
      AND s.exited_at IS NULL
  );

COMMIT;

-- Check: expect 2000, 2000, 2000.
-- SELECT
--   (SELECT count(*) FROM public.guests WHERE user_id LIKE 'load\_guest\_%'),
--   (SELECT count(*) FROM public.tickets
--     WHERE event_id = 'b6b6b6b6-0000-4000-8000-000000000001'),
--   (SELECT count(*) FROM public.event_sessions
--     WHERE event_id = 'b6b6b6b6-0000-4000-8000-000000000001'
--       AND exited_at IS NULL);
