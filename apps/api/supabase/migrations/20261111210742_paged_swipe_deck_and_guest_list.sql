-- Migration: the Matches deck and the event guest list in pages.
--
-- Both screens sent a whole event to every phone. GET /guests/swipeable read
-- every checked-in guest's full row in one request, with all their ids in the
-- URL, and the app asked again every 15 s. GET /tickets/attendees read
-- tickets, guests(*) and users for the whole event. Past a few hundred guests
-- the URL and the API's row cap break the deck, and both payloads grow with
-- the crowd.
--
-- 1. get_swipe_deck returns one page of the deck plus the counts the like
--    limit needs, in one call. The deck is exactly who
--    submit_guest_swipe_with_limit counts as eligible: checked in at the
--    event, not the viewer, not matched with them, no block either way, and
--    visible to them (everyone, or liked and they liked the viewer here); then
--    the gender, age and interest filters. Guests the viewer liked stay in,
--    marked liked_by_me.
--    Order: the 10-minute wave the guest checked in, then a shuffle fixed per
--    viewer. Early arrivals aren't on top of everyone's deck, and later
--    arrivals come after the pages a viewer has already seen, where paging on
--    finds them. The cursor is the last row's sort key (12 digits, 32 hex).
--    next_cursor is set while more rows follow; end_cursor is always the
--    page's last row, so a viewer at the end of the deck can ask from there
--    for guests who checked in since. present_guest_count counts the guests
--    shown to the viewer before the filters, so the app can tell an empty
--    event from filters that leave nobody.
-- 2. get_event_guest_list returns the event's numbers, counted over everyone
--    going, and one page of the guests the viewer may see: the viewer first,
--    then the others by ticket. Someone not going gets the numbers only, as
--    before.
-- 3. Indexes for the lookups both make: tickets by event, and matches by
--    their second guest (the unique pair index starts with the first).
--
-- Both run as the caller and only service_role may execute them: they take
-- the viewer's id as an argument, so through PostgREST anon or authenticated
-- could otherwise read any event's guests. The API keeps working before this
-- is applied; it falls back to its old queries while the functions are
-- missing. Safe to re-run.

BEGIN;

CREATE INDEX IF NOT EXISTS tickets_event_id_idx
  ON public.tickets USING btree (event_id);

CREATE INDEX IF NOT EXISTS matches_guest_id_2_event_id_idx
  ON public.matches USING btree (guest_id_2, event_id);

CREATE OR REPLACE FUNCTION public.get_swipe_deck(
  p_viewer_id text,
  p_event_id uuid,
  p_gender_filter text DEFAULT 'everyone',
  p_age_min integer DEFAULT NULL,
  p_age_max integer DEFAULT NULL,
  p_interest_filters text[] DEFAULT '{}'::text[],
  p_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH params AS (
    SELECT
      CASE
        WHEN p_gender_filter IN ('male', 'female', 'other', 'everyone') THEN p_gender_filter
        ELSE 'everyone'
      END AS gender_filter,
      COALESCE(p_interest_filters, '{}'::text[]) AS interest_filters,
      LEAST(GREATEST(COALESCE(p_limit, 25), 0), 50) AS page_size,
      timezone('utc', now())::date AS today
  ),
  matched_ids AS (
    SELECT
      CASE
        WHEN m.guest_id_1 = p_viewer_id THEN m.guest_id_2
        ELSE m.guest_id_1
      END AS user_id
    FROM public.matches m
    WHERE m.event_id = p_event_id
      AND (m.guest_id_1 = p_viewer_id OR m.guest_id_2 = p_viewer_id)
  ),
  checked_in AS (
    -- One row per guest, whatever duplicate sessions exist.
    SELECT es.user_id, min(es.entered_at) AS entered_at
    FROM public.event_sessions es
    WHERE es.event_id = p_event_id
      AND es.exited_at IS NULL
      AND es.user_id <> p_viewer_id
    GROUP BY es.user_id
  ),
  shown AS (
    SELECT
      g.user_id,
      g.gender,
      g.birthday,
      COALESCE(g.interests, '{}'::text[]) AS interests,
      COALESCE(g.picture_urls, '{}'::text[]) AS picture_urls,
      g.bio,
      lpad(
        floor(extract(epoch FROM COALESCE(ci.entered_at, 'epoch'::timestamptz)) / 600)::bigint::text,
        12,
        '0'
      ) || md5(p_viewer_id || '/' || g.user_id) AS sort_key
    FROM checked_in ci
    INNER JOIN public.guests g ON g.user_id = ci.user_id
    WHERE NOT EXISTS (
        SELECT 1
        FROM matched_ids mi
        WHERE mi.user_id = ci.user_id
      )
      -- A block either way hides each guest from the other.
      AND NOT EXISTS (
        SELECT 1
        FROM public.guest_blocks gb
        WHERE (gb.blocker_id = p_viewer_id AND gb.blocked_id = ci.user_id)
           OR (gb.blocker_id = ci.user_id AND gb.blocked_id = p_viewer_id)
      )
      -- The guest's visibility: everyone, or only guests they liked here.
      AND (
        g.visibility = 'everyone'
        OR (
          g.visibility = 'liked'
          AND EXISTS (
            SELECT 1
            FROM public.guest_swipes theirs
            WHERE theirs.swiper_user_id = ci.user_id
              AND theirs.swiped_user_id = p_viewer_id
              AND theirs.event_id = p_event_id
              AND theirs.liked = true
          )
        )
      )
  ),
  eligible AS (
    SELECT
      s.*,
      EXTRACT(YEAR FROM age(pr.today, s.birthday::date))::integer AS age
    FROM shown s
    CROSS JOIN params pr
    WHERE (pr.gender_filter = 'everyone' OR s.gender::text = pr.gender_filter)
      AND (
        p_age_min IS NULL
        OR EXTRACT(YEAR FROM age(pr.today, s.birthday::date))::integer >= p_age_min
      )
      AND (
        p_age_max IS NULL
        OR EXTRACT(YEAR FROM age(pr.today, s.birthday::date))::integer <= p_age_max
      )
      AND (
        COALESCE(array_length(pr.interest_filters, 1), 0) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(pr.interest_filters) AS selected_interest
          WHERE selected_interest = ANY(s.interests)
        )
      )
  ),
  -- One row more than the page, to tell whether another page follows.
  page AS (
    SELECT e.*, row_number() OVER (ORDER BY e.sort_key) AS rn
    FROM eligible e
    WHERE p_cursor IS NULL OR e.sort_key > p_cursor
    ORDER BY e.sort_key
    LIMIT (SELECT pr.page_size + 1 FROM params pr)
  )
  SELECT jsonb_build_object(
    'eligible_guest_count', (SELECT count(*) FROM eligible),
    'present_guest_count', (SELECT count(*) FROM shown),
    'likes_used', (
      SELECT count(*)
      FROM public.guest_swipes mine
      WHERE mine.swiper_user_id = p_viewer_id
        AND mine.event_id = p_event_id
        AND mine.liked = true
    ),
    'profiles', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', p.user_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'avatar_url', u.avatar_url,
          'gender', p.gender,
          'picture_urls', to_jsonb(p.picture_urls),
          'age', p.age,
          'interests', to_jsonb(p.interests),
          'bio', p.bio,
          'liked_by_me', EXISTS (
            SELECT 1
            FROM public.guest_swipes mine
            WHERE mine.swiper_user_id = p_viewer_id
              AND mine.swiped_user_id = p.user_id
              AND mine.event_id = p_event_id
              AND mine.liked = true
          )
        )
        ORDER BY p.sort_key
      )
      FROM page p
      CROSS JOIN params pr
      LEFT JOIN public.users u ON u.id = p.user_id
      WHERE p.rn <= pr.page_size
    ), '[]'::jsonb),
    'next_cursor', (
      SELECT CASE
        WHEN pr.page_size > 0 AND EXISTS (SELECT 1 FROM page p WHERE p.rn > pr.page_size)
        THEN (SELECT max(p.sort_key) FROM page p WHERE p.rn <= pr.page_size)
      END
      FROM params pr
    ),
    'end_cursor', (
      SELECT max(p.sort_key)
      FROM page p
      CROSS JOIN params pr
      WHERE p.rn <= pr.page_size
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_event_guest_list(
  p_viewer_id text,
  p_event_id uuid,
  p_cursor text DEFAULT NULL,
  p_limit integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH params AS (
    SELECT
      LEAST(GREATEST(COALESCE(p_limit, 30), 0), 50) AS page_size,
      timezone('utc', now())::date AS today
  ),
  going AS (
    SELECT
      t.id AS ticket_id,
      t.guest_id,
      COALESCE(g.visibility, 'everyone') AS visibility,
      g.gender,
      CASE
        WHEN g.birthday IS NULL THEN NULL
        ELSE EXTRACT(YEAR FROM age(pr.today, g.birthday::date))::integer
      END AS age,
      u.first_name,
      u.last_name,
      u.avatar_url
    FROM public.tickets t
    CROSS JOIN params pr
    LEFT JOIN public.guests g ON g.user_id = t.guest_id
    LEFT JOIN public.users u ON u.id = t.guest_id
    WHERE t.event_id = p_event_id
  ),
  -- Only guests going see who else is. The viewer is always listed; another
  -- guest only with no block either way and a visibility that includes the
  -- viewer.
  listed AS (
    SELECT
      gg.*,
      CASE WHEN gg.guest_id = p_viewer_id THEN '0' ELSE '1' END || gg.ticket_id::text AS sort_key
    FROM going gg
    WHERE EXISTS (SELECT 1 FROM going me WHERE me.guest_id = p_viewer_id)
      AND (
        gg.guest_id = p_viewer_id
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.guest_blocks gb
            WHERE (gb.blocker_id = p_viewer_id AND gb.blocked_id = gg.guest_id)
               OR (gb.blocker_id = gg.guest_id AND gb.blocked_id = p_viewer_id)
          )
          AND (
            gg.visibility = 'everyone'
            OR (
              gg.visibility = 'liked'
              AND EXISTS (
                SELECT 1
                FROM public.guest_swipes theirs
                WHERE theirs.swiper_user_id = gg.guest_id
                  AND theirs.swiped_user_id = p_viewer_id
                  AND theirs.event_id = p_event_id
                  AND theirs.liked = true
              )
            )
          )
        )
      )
  ),
  page AS (
    SELECT l.*, row_number() OVER (ORDER BY l.sort_key) AS rn
    FROM listed l
    WHERE p_cursor IS NULL OR l.sort_key > p_cursor
    ORDER BY l.sort_key
    LIMIT (SELECT pr.page_size + 1 FROM params pr)
  )
  SELECT jsonb_build_object(
    'max_spots', COALESCE((
      SELECT v.capacity
      FROM public.events e
      INNER JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = p_event_id
    ), 0),
    'going_count', (SELECT count(*) FROM going),
    'listed_count', (SELECT count(*) FROM listed),
    'females', (SELECT count(*) FROM going WHERE gender = 'female'),
    'males', (SELECT count(*) FROM going WHERE gender = 'male'),
    'average_age', (SELECT round(avg(age))::integer FROM going WHERE age IS NOT NULL),
    'guests', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_url', p.avatar_url,
          'age', p.age,
          'gender', p.gender,
          'is_viewer', p.guest_id = p_viewer_id
        )
        ORDER BY p.sort_key
      )
      FROM page p
      CROSS JOIN params pr
      WHERE p.rn <= pr.page_size
    ), '[]'::jsonb),
    'next_cursor', (
      SELECT CASE
        WHEN pr.page_size > 0 AND EXISTS (SELECT 1 FROM page p WHERE p.rn > pr.page_size)
        THEN (SELECT max(p.sort_key) FROM page p WHERE p.rn <= pr.page_size)
      END
      FROM params pr
    )
  )
$$;

REVOKE ALL ON FUNCTION public.get_swipe_deck(text, uuid, text, integer, integer, text[], text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_swipe_deck(text, uuid, text, integer, integer, text[], text, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_event_guest_list(text, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_guest_list(text, uuid, text, integer)
  TO service_role;

COMMIT;

-- Check after applying. Expect true, false, false for both functions:
-- SELECT p.proname,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname IN ('get_swipe_deck', 'get_event_guest_list');
-- And expect both indexes:
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN ('tickets_event_id_idx', 'matches_guest_id_2_event_id_idx');
