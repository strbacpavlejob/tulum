-- Migration: allow at most one ticket per guest per event.
-- attendEvent checked for an existing ticket and then inserted, so concurrent
-- RSVPs could all pass the check and create duplicate tickets.
-- Safe to re-run: it is a no-op once the constraint exists.

DO $$
DECLARE
  v_removed integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tickets'::regclass
      AND conname = 'tickets_guest_id_event_id_key'
  ) THEN
    RETURN;
  END IF;

  -- Block ticket writes until the constraint exists so no new duplicate can
  -- slip in between the cleanup and the ALTER TABLE.
  LOCK TABLE public.tickets IN SHARE ROW EXCLUSIVE MODE;

  -- Keep the earliest ticket of each guest/event and move check-in sessions
  -- that point at a later copy onto it before the copies are deleted.
  WITH ranked AS (
    SELECT
      id,
      first_value(id) OVER w AS kept_id,
      row_number() OVER w AS copy_number
    FROM public.tickets
    WINDOW w AS (PARTITION BY guest_id, event_id ORDER BY created_at, id)
  )
  UPDATE public.event_sessions es
  SET ticket_id = r.kept_id
  FROM ranked r
  WHERE es.ticket_id = r.id
    AND r.copy_number > 1;

  DELETE FROM public.tickets t
  USING (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY guest_id, event_id ORDER BY created_at, id
      ) AS copy_number
    FROM public.tickets
  ) r
  WHERE t.id = r.id
    AND r.copy_number > 1;
  GET DIAGNOSTICS v_removed = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate ticket(s)', v_removed;

  ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_guest_id_event_id_key UNIQUE (guest_id, event_id);
END $$;
