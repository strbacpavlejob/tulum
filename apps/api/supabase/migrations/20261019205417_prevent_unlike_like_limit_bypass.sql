-- Migration: keep likes final so un-liking cannot free like-limit slots.
-- likes_used counts only liked = true rows, and the upsert let a pass
-- overwrite an earlier like. At the cap a guest could un-like one profile
-- and then like another. A pass on an already-liked guest is now refused
-- (allowed = false) and the like is kept. The rest of the function is
-- unchanged from 20261013135207_allow_other_gender_in_swipe_filters.sql.
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

-- CREATE OR REPLACE keeps the function's existing EXECUTE grants.
