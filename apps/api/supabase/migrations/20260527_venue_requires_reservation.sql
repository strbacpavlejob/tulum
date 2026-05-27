-- Migration: venue_requires_reservation
-- Adds a boolean flag to venues indicating whether attending an event at this
-- venue requires a prior reservation via the venue's contact info.
-- Defaults to true so new venues require a reservation by default.

ALTER TABLE "public"."venues"
    ADD COLUMN IF NOT EXISTS "requires_reservation" boolean DEFAULT true NOT NULL;

COMMENT ON COLUMN "public"."venues"."requires_reservation" IS
    'When true, attendees must contact the venue to make a reservation before the app marks them as attending.';
