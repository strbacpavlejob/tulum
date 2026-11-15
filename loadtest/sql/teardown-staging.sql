-- Load test teardown: removes what seed-staging.sql made and what the test
-- wrote (swipes, matches, chats, messages, check-ins), and the load users'
-- rows the API made from Clerk. It deletes only the load test's own rows
-- (its event, venue and host by id, and the users load_guest_... and
-- load-NN+clerk_test@example.com), so it leaves any other data alone.
-- Run token-users.mjs delete as well to remove those users from Clerk.

BEGIN;

-- The event, with its tickets, check-ins, swipes, matches, chats, messages
-- and engagements (all cascade from it).
DELETE FROM public.events
WHERE id = 'b6b6b6b6-0000-4000-8000-000000000001';

-- The seeded guests and the load users (load-NN+clerk_test@example.com).
-- settings is the one table that doesn't cascade from users.
DELETE FROM public.settings
WHERE user_id LIKE 'load\_guest\_%'
   OR user_id IN (
     SELECT id FROM public.users
     WHERE email LIKE 'load-%+clerk\_test@example.com'
   );
DELETE FROM public.users
WHERE id LIKE 'load\_guest\_%'
   OR email LIKE 'load-%+clerk\_test@example.com';

DELETE FROM public.venues
WHERE id = 'b6b6b6b6-0000-4000-8000-000000000002';
DELETE FROM public.hosts WHERE user_id = 'load_host';
DELETE FROM public.users WHERE id = 'load_host';

COMMIT;

-- Check: expect 0.
-- SELECT count(*) FROM public.users
-- WHERE id LIKE 'load\_%' OR email LIKE 'load-%+clerk\_test@example.com';
