-- Migration: close the remaining paths that let the anon key, or any token for
-- the authenticated role, write through the Data API.
-- 1. venue_contacts: the policy "Hosts can manage own venue contacts" is
--    FOR ALL with WITH CHECK (true). An INSERT only evaluates the check, so
--    anyone could add contact rows. Only the API writes this table, with the
--    service role, so anon and authenticated keep SELECT (for the
--    "Anyone can view venue contacts" policy) and lose everything else.
--    Grants are checked before RLS, so the write policy no longer matters
--    for them. The service role's grant is restated because schema.sql has
--    none for this table; on dev it already holds it.
-- 2. get_engagement_chart_data and submit_guest_swipe_with_limit trust the
--    venue ids, swiper id and limits they are given, and only the API calls
--    them, with the service role. Like attend_event_with_overlap_check, they
--    are now executable by service_role only.
-- Independent of 20261020070215_private_tables_service_role_only.sql; the two
-- can be applied in either order. Safe to re-run.

REVOKE ALL ON TABLE public.venue_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.venue_contacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.venue_contacts
  TO service_role;

REVOKE ALL ON FUNCTION public.get_engagement_chart_data(uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_engagement_chart_data(uuid[], uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.submit_guest_swipe_with_limit(
  text, text, uuid, boolean, numeric, integer, text, integer, integer, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_swipe_with_limit(
  text, text, uuid, boolean, numeric, integer, text, integer, integer, text[]
) TO service_role;

-- Check after applying; expect one row of t | f | t | f | f | t:
-- SELECT has_table_privilege('anon', 'public.venue_contacts', 'SELECT')
--          AS anon_reads_contacts,
--        has_table_privilege('anon', 'public.venue_contacts',
--          'INSERT, UPDATE, DELETE, TRUNCATE')
--        OR has_table_privilege('authenticated', 'public.venue_contacts',
--          'INSERT, UPDATE, DELETE, TRUNCATE') AS clients_write_contacts,
--        has_table_privilege('service_role', 'public.venue_contacts',
--          'INSERT')
--        AND has_table_privilege('service_role', 'public.venue_contacts',
--          'UPDATE')
--        AND has_table_privilege('service_role', 'public.venue_contacts',
--          'DELETE') AS service_role_writes_contacts,
--        has_function_privilege('anon', f.chart, 'EXECUTE')
--        OR has_function_privilege('authenticated', f.chart, 'EXECUTE')
--          AS clients_run_chart,
--        has_function_privilege('anon', f.swipe, 'EXECUTE')
--        OR has_function_privilege('authenticated', f.swipe, 'EXECUTE')
--          AS clients_run_swipe,
--        has_function_privilege('service_role', f.chart, 'EXECUTE')
--        AND has_function_privilege('service_role', f.swipe, 'EXECUTE')
--          AS service_role_runs_both
-- FROM (SELECT
--         'public.get_engagement_chart_data(uuid[], uuid)'::regprocedure::oid
--           AS chart,
--         'public.submit_guest_swipe_with_limit(text, text, uuid, boolean, numeric, integer, text, integer, integer, text[])'::regprocedure::oid
--           AS swipe) f;
