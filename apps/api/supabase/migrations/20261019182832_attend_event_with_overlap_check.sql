-- Migration: make the RSVP overlap check and the ticket insert atomic.
-- attendEvent read the guest's other tickets, compared event windows and only
-- then inserted, so two concurrent RSVPs from one guest to two different
-- overlapping events could both pass the check and both insert.
-- Apply after 20261019144431_unique_ticket_per_guest_event.sql: the ON CONFLICT
-- below needs tickets_guest_id_event_id_key.

DO $$
BEGIN
  -- Without the constraint the function would still be created, but every
  -- new RSVP would fail when the INSERT is planned.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tickets'::regclass
      AND conname = 'tickets_guest_id_event_id_key'
  ) THEN
    RAISE EXCEPTION 'Apply 20261019144431_unique_ticket_per_guest_event.sql first';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.attend_event_with_overlap_check(
  p_guest_id text,
  p_event_id uuid
)
RETURNS TABLE (
  ticket public.tickets,
  is_new boolean,
  conflicting_event_title text
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_ticket public.tickets;
  v_start_date_time timestamp;
  v_end_date_time timestamp;
  v_conflicting_title text;
BEGIN
  -- Serialize RSVPs per guest. A concurrent call waits here and, since each
  -- statement below takes a fresh snapshot (READ COMMITTED), then sees the
  -- ticket the previous call committed.
  PERFORM pg_advisory_xact_lock(hashtext('attend_event'), hashtext(p_guest_id));

  SELECT t.*
  INTO v_ticket
  FROM public.tickets t
  WHERE t.guest_id = p_guest_id
    AND t.event_id = p_event_id;

  IF FOUND THEN
    RETURN QUERY SELECT v_ticket, false, NULL::text;
    RETURN;
  END IF;

  SELECT e.start_date_time, e.end_date_time
  INTO v_start_date_time, v_end_date_time
  FROM public.events e
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_event_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Two windows overlap when start1 < end2 AND start2 < end1.
  SELECT e.title
  INTO v_conflicting_title
  FROM public.tickets t
  INNER JOIN public.events e ON e.id = t.event_id
  WHERE t.guest_id = p_guest_id
    AND t.event_id <> p_event_id
    AND e.start_date_time < v_end_date_time
    AND v_start_date_time < e.end_date_time
  ORDER BY e.start_date_time, e.id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT NULL::public.tickets, false, v_conflicting_title;
    RETURN;
  END IF;

  LOOP
    INSERT INTO public.tickets (guest_id, event_id)
    VALUES (p_guest_id, p_event_id)
    ON CONFLICT (guest_id, event_id) DO NOTHING
    RETURNING * INTO v_ticket;

    IF FOUND THEN
      RETURN QUERY SELECT v_ticket, true, NULL::text;
      RETURN;
    END IF;

    -- A writer that skips the lock above (e.g. POST /tickets) created the
    -- ticket first. Return it, or insert again if it was deleted meanwhile.
    SELECT t.*
    INTO v_ticket
    FROM public.tickets t
    WHERE t.guest_id = p_guest_id
      AND t.event_id = p_event_id;

    IF FOUND THEN
      RETURN QUERY SELECT v_ticket, false, NULL::text;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

-- Only the API calls this, with the service role; it trusts p_guest_id.
REVOKE ALL ON FUNCTION public.attend_event_with_overlap_check(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attend_event_with_overlap_check(text, uuid)
  TO service_role;
