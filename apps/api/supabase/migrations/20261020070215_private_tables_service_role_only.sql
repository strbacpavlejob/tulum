-- Migration: only the service role may read or write the public tables that
-- had RLS disabled: chat_messages, chats, event_engagements, event_sessions,
-- matches, settings and tickets.
-- Each had RLS off and every privilege granted to anon and authenticated, so
-- anyone with the project's anon key, which Supabase treats as public, could
-- use PostgREST to read every chat message, match, ticket, check-in session,
-- engagement and setting, and create, change or delete them for any user,
-- skipping the API's checks.
-- The API is the only client of these tables and uses the service role,
-- which keeps its grants and bypasses RLS. No client app, policy, view,
-- trigger or realtime publication uses them (checked 2026-10-20). The two
-- functions that read them, get_engagement_chart_data and
-- submit_guest_swipe_with_limit, are SECURITY INVOKER and the API calls them
-- with the service role, so only direct anon or authenticated calls lose
-- access. Safe to re-run.

-- Deny by default. No policies on purpose, so anon and authenticated see no
-- rows even if a later GRANT (or the schema's default privileges) returns.
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS does not cover TRUNCATE, so the grants go as well.
REVOKE ALL ON TABLE
  public.chat_messages,
  public.chats,
  public.event_engagements,
  public.event_sessions,
  public.matches,
  public.settings,
  public.tickets
FROM PUBLIC, anon, authenticated;

-- The id sequences of event_sessions and matches. The other five tables use
-- gen_random_uuid() or a text key.
REVOKE ALL ON SEQUENCE
  public.event_sessions_id_seq,
  public.matches_id_seq
FROM PUBLIC, anon, authenticated;

-- Check after applying; expect 7 rows of t | f | f | t:
-- SELECT c.relname,
--        c.relrowsecurity,
--        has_table_privilege('anon', c.oid,
--          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') AS anon_any,
--        has_table_privilege('authenticated', c.oid,
--          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') AS authenticated_any,
--        has_table_privilege('service_role', c.oid,
--          'SELECT, INSERT, UPDATE, DELETE') AS service_role_any
-- FROM pg_class c
-- WHERE c.relnamespace = 'public'::regnamespace
--   AND c.relname IN ('chat_messages', 'chats', 'event_engagements',
--                     'event_sessions', 'matches', 'settings', 'tickets')
-- ORDER BY c.relname;
