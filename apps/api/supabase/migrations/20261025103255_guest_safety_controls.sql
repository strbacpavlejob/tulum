-- Migration: guest safety controls (QA TASK-001). Guests can block and
-- report other guests and choose who sees them at events.
--
-- 1. guests.visibility: who sees the guest on an event's guest list and in
--    the Matches deck. 'everyone' (the default: every guest going to the
--    event), 'liked' (only guests they have liked at that event) or 'hidden'
--    (nobody; Matches is paused for them). PATCH /users/me writes it.
-- 2. guest_blocks: one row per block. A block works both ways: the API
--    leaves each guest out of the other's deck, guest lists, inbox and
--    chats. POST /blocks and POST /reports/guests write it. There is no
--    unblock in the app.
-- 3. guest_reports: reports of a guest from a profile or a chat, for an
--    admin to review (GET /reports/guests). A report from a chat keeps a
--    copy of the chat's last messages, because the cleanup deletes the chat
--    with its match after the event.
-- 4. submit_guest_swipe_with_limit counts only the guests the swiper can
--    see, as GET /guests/swipeable lists them: not blocked either way, and
--    'everyone', or 'liked' and they liked the swiper at this event. So the
--    like limit matches the deck. The rest of the function is unchanged
--    from 20261019205417_prevent_unlike_like_limit_bypass.sql.
--
-- The new tables follow 20261020070215_private_tables_service_role_only.sql:
-- RLS on with no policies, and only the service role (the API) has grants.
-- From 2026-10-30 Supabase gives new tables no default grants, so the
-- service role's are granted here. Safe to re-run.

BEGIN;

-- 1. Who sees a guest at events. Adding a column with a constant default
-- doesn't rewrite the table.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass
      AND conname = 'guests_visibility_check'
  ) THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_visibility_check
      CHECK (visibility IN ('everyone', 'liked', 'hidden'));
  END IF;
END $$;

-- 2. Blocks. They reference users, not guests, so a block outlives a guest
-- profile being made again and goes only with the account.
CREATE TABLE IF NOT EXISTS public.guest_blocks (
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT guest_blocks_pkey PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT guest_blocks_blocker_id_fkey FOREIGN KEY (blocker_id)
    REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT guest_blocks_blocked_id_fkey FOREIGN KEY (blocked_id)
    REFERENCES public.users (id) ON DELETE CASCADE,
  CONSTRAINT guest_blocks_not_self CHECK (blocker_id <> blocked_id)
);

-- The primary key serves lookups by blocker; this one, by blocked guest.
CREATE INDEX IF NOT EXISTS guest_blocks_blocked_id_idx
  ON public.guest_blocks USING btree (blocked_id);

-- 3. Reports. SET NULL keeps a report when an account, event or match is
-- deleted.
CREATE TABLE IF NOT EXISTS public.guest_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id text,
  reported_user_id text,
  event_id uuid,
  match_id bigint,
  source text NOT NULL,
  reason text NOT NULL,
  details text,
  -- From a chat: up to its last 50 messages, oldest first, as
  -- [{sender_id, message, sent_at}].
  messages jsonb,
  status public.report_status_enum NOT NULL DEFAULT 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT guest_reports_pkey PRIMARY KEY (id),
  CONSTRAINT guest_reports_reporter_id_fkey FOREIGN KEY (reporter_id)
    REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT guest_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id)
    REFERENCES public.users (id) ON DELETE SET NULL,
  CONSTRAINT guest_reports_event_id_fkey FOREIGN KEY (event_id)
    REFERENCES public.events (id) ON DELETE SET NULL,
  CONSTRAINT guest_reports_match_id_fkey FOREIGN KEY (match_id)
    REFERENCES public.matches (id) ON DELETE SET NULL,
  CONSTRAINT guest_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by)
    REFERENCES public.users (id) ON DELETE SET NULL,
  -- <> rather than IS DISTINCT FROM, so both ids becoming NULL passes.
  CONSTRAINT guest_reports_not_self CHECK (reporter_id <> reported_user_id),
  CONSTRAINT guest_reports_source_check
    CHECK (source IN ('profile', 'chat')),
  CONSTRAINT guest_reports_reason_check
    CHECK (reason IN ('harassment', 'inappropriate', 'fake_profile', 'spam',
                      'underage', 'unsafe_meeting', 'other')),
  CONSTRAINT guest_reports_details_length_check
    CHECK (char_length(details) <= 1000)
);

-- The admin list reads by status, newest first.
CREATE INDEX IF NOT EXISTS guest_reports_status_created_at_idx
  ON public.guest_reports USING btree (status, created_at DESC);
-- Every foreign key, so deleting a user, event or match doesn't scan reports.
CREATE INDEX IF NOT EXISTS guest_reports_reporter_id_idx
  ON public.guest_reports USING btree (reporter_id);
CREATE INDEX IF NOT EXISTS guest_reports_reported_user_id_idx
  ON public.guest_reports USING btree (reported_user_id);
CREATE INDEX IF NOT EXISTS guest_reports_event_id_idx
  ON public.guest_reports USING btree (event_id);
CREATE INDEX IF NOT EXISTS guest_reports_match_id_idx
  ON public.guest_reports USING btree (match_id);
CREATE INDEX IF NOT EXISTS guest_reports_reviewed_by_idx
  ON public.guest_reports USING btree (reviewed_by);

-- Only the API, which uses the service role. No policies on purpose.
ALTER TABLE public.guest_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.guest_blocks, public.guest_reports
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.guest_blocks, public.guest_reports
  TO service_role;

-- 4. The like limit counts only the guests the swiper can see.
CREATE OR REPLACE FUNCTION public.submit_guest_swipe_with_limit(
  p_swiper_user_id text,
  p_swiped_user_id text,
  p_event_id uuid,
  p_liked boolean,
  p_max_like_percentage numeric DEFAULT 0.2,
  p_min_like_limit integer DEFAULT 3,
  p_gender_filter text DEFAULT 'everyone',
  p_age_min integer DEFAULT NULL,
  p_age_max integer DEFAULT NULL,
  p_interest_filters text[] DEFAULT '{}'::text[]
)
RETURNS TABLE (
  allowed boolean,
  was_already_liked boolean,
  likes_used integer,
  like_limit integer,
  eligible_guest_count integer,
  limit_reached boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_liked boolean;
  v_likes_used_before integer;
  v_likes_used_after integer;
  v_eligible_count integer;
  v_raw_limit integer;
  v_effective_limit integer;
  v_interest_filters text[] := COALESCE(p_interest_filters, '{}'::text[]);
  v_gender_filter text :=
    CASE
      WHEN p_gender_filter IN ('male', 'female', 'other', 'everyone') THEN p_gender_filter
      ELSE 'everyone'
    END;
BEGIN
  -- Serialize decisions per user/event to avoid concurrent limit bypasses.
  PERFORM pg_advisory_xact_lock(hashtext(p_swiper_user_id), hashtext(p_event_id::text));

  SELECT gs.liked
  INTO v_existing_liked
  FROM public.guest_swipes gs
  WHERE gs.swiper_user_id = p_swiper_user_id
    AND gs.swiped_user_id = p_swiped_user_id
    AND gs.event_id = p_event_id
  FOR UPDATE;

  SELECT COUNT(*)::integer
  INTO v_likes_used_before
  FROM public.guest_swipes gs
  WHERE gs.swiper_user_id = p_swiper_user_id
    AND gs.event_id = p_event_id
    AND gs.liked = true;

  WITH matched_ids AS (
    SELECT
      CASE
        WHEN m.guest_id_1 = p_swiper_user_id THEN m.guest_id_2
        ELSE m.guest_id_1
      END AS user_id
    FROM public.matches m
    WHERE m.event_id = p_event_id
      AND (m.guest_id_1 = p_swiper_user_id OR m.guest_id_2 = p_swiper_user_id)
  ),
  eligible_guests AS (
    SELECT DISTINCT
      g.user_id,
      g.gender,
      g.birthday,
      COALESCE(g.interests, '{}'::text[]) AS interests
    FROM public.event_sessions es
    INNER JOIN public.guests g ON g.user_id = es.user_id
    WHERE es.event_id = p_event_id
      AND es.exited_at IS NULL
      AND es.user_id <> p_swiper_user_id
      AND NOT EXISTS (
        SELECT 1
        FROM matched_ids mi
        WHERE mi.user_id = es.user_id
      )
      -- A block either way hides each guest from the other.
      AND NOT EXISTS (
        SELECT 1
        FROM public.guest_blocks gb
        WHERE (gb.blocker_id = p_swiper_user_id AND gb.blocked_id = es.user_id)
           OR (gb.blocker_id = es.user_id AND gb.blocked_id = p_swiper_user_id)
      )
      -- The guest's visibility: everyone, or only guests they liked here.
      AND (
        g.visibility = 'everyone'
        OR (
          g.visibility = 'liked'
          AND EXISTS (
            SELECT 1
            FROM public.guest_swipes theirs
            WHERE theirs.swiper_user_id = es.user_id
              AND theirs.swiped_user_id = p_swiper_user_id
              AND theirs.event_id = p_event_id
              AND theirs.liked = true
          )
        )
      )
  )
  SELECT COUNT(*)::integer
  INTO v_eligible_count
  FROM eligible_guests eg
  WHERE (v_gender_filter = 'everyone' OR eg.gender::text = v_gender_filter)
    AND (
      p_age_min IS NULL
      OR EXTRACT(YEAR FROM age(timezone('utc', now())::date, eg.birthday::date))::integer >= p_age_min
    )
    AND (
      p_age_max IS NULL
      OR EXTRACT(YEAR FROM age(timezone('utc', now())::date, eg.birthday::date))::integer <= p_age_max
    )
    AND (
      COALESCE(array_length(v_interest_filters, 1), 0) = 0
      OR EXISTS (
        SELECT 1
        FROM unnest(v_interest_filters) AS selected_interest
        WHERE selected_interest = ANY(eg.interests)
      )
    );

  IF v_eligible_count <= 0 THEN
    v_raw_limit := 0;
  ELSE
    v_raw_limit := LEAST(
      v_eligible_count,
      GREATEST(
        p_min_like_limit,
        FLOOR(v_eligible_count * p_max_like_percentage)::integer
      )
    );
  END IF;

  v_effective_limit := GREATEST(v_raw_limit, v_likes_used_before);

  -- Likes are final: a pass would lower likes_used and free a slot for
  -- another like.
  IF NOT p_liked AND COALESCE(v_existing_liked, false) THEN
    RETURN QUERY
    SELECT
      false,
      true,
      v_likes_used_before,
      v_effective_limit,
      v_eligible_count,
      v_likes_used_before >= v_effective_limit;
    RETURN;
  END IF;

  IF p_liked AND COALESCE(v_existing_liked, false) = false THEN
    IF v_likes_used_before >= v_effective_limit THEN
      RETURN QUERY
      SELECT
        false,
        false,
        v_likes_used_before,
        v_effective_limit,
        v_eligible_count,
        true;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.guest_swipes (
    swiper_user_id,
    swiped_user_id,
    event_id,
    liked
  )
  VALUES (
    p_swiper_user_id,
    p_swiped_user_id,
    p_event_id,
    p_liked
  )
  ON CONFLICT (swiper_user_id, swiped_user_id, event_id)
  DO UPDATE
  SET
    liked = EXCLUDED.liked,
    updated_at = timezone('utc', now());

  SELECT COUNT(*)::integer
  INTO v_likes_used_after
  FROM public.guest_swipes gs
  WHERE gs.swiper_user_id = p_swiper_user_id
    AND gs.event_id = p_event_id
    AND gs.liked = true;

  v_effective_limit := GREATEST(v_raw_limit, v_likes_used_after);

  RETURN QUERY
  SELECT
    true,
    (COALESCE(v_existing_liked, false) AND p_liked),
    v_likes_used_after,
    v_effective_limit,
    v_eligible_count,
    v_likes_used_after >= v_effective_limit;
END;
$$;

-- CREATE OR REPLACE keeps the function's existing EXECUTE grants (service
-- role only, since 20261020072217_close_remaining_anon_write_paths.sql).

COMMIT;

-- Checks after applying.
-- Expect one row (visibility, text, NO, 'everyone'::text) and the CHECK:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'guests'
--   AND column_name = 'visibility';
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conname = 'guests_visibility_check';
--
-- Expect 2 rows of t | f | f | t:
-- SELECT c.relname,
--        c.relrowsecurity,
--        has_table_privilege('anon', c.oid,
--          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') AS anon_any,
--        has_table_privilege('authenticated', c.oid,
--          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE') AS authenticated_any,
--        has_table_privilege('service_role', c.oid,
--          'SELECT, INSERT, UPDATE, DELETE') AS service_role_all
-- FROM pg_class c
-- WHERE c.relnamespace = 'public'::regnamespace
--   AND c.relname IN ('guest_blocks', 'guest_reports')
-- ORDER BY c.relname;
--
-- Expect the new body (it mentions guest_blocks) and EXECUTE for
-- service_role only:
-- SELECT position('guest_blocks' IN p.prosrc) > 0 AS counts_blocks,
--        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') AS sr_exec
-- FROM pg_proc p
-- WHERE p.proname = 'submit_guest_swipe_with_limit'
--   AND p.pronamespace = 'public'::regnamespace;
