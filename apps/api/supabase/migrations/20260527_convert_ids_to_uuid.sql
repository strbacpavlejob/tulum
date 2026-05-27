-- Migration: Convert integer/bigint PKs to UUID
-- Tables migrated: venue_contacts, venues, events, tickets,
--                  event_engagements, chats, chat_messages
-- FK columns updated in: event_sessions, matches (not UUID-PK themselves)
-- Wrapped in a transaction so any failure rolls back cleanly.

BEGIN;

-- ── 0. Ensure UUID generation is available ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1: Add temporary UUID columns for every PK and every FK being changed
-- ─────────────────────────────────────────────────────────────────────────

-- New PK UUID columns (auto-populated for all existing rows)
ALTER TABLE "public"."venue_contacts"    ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "public"."venues"            ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "public"."events"            ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "public"."tickets"           ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "public"."event_engagements" ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "public"."chats"             ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "public"."chat_messages"     ADD COLUMN "_uuid" uuid DEFAULT gen_random_uuid() NOT NULL;

-- New FK UUID columns (nullable; populated by join in Step 2)
ALTER TABLE "public"."venues"            ADD COLUMN "_contact_uuid" uuid;
ALTER TABLE "public"."events"            ADD COLUMN "_venue_uuid"   uuid;
ALTER TABLE "public"."tickets"           ADD COLUMN "_event_uuid"   uuid;
ALTER TABLE "public"."event_engagements" ADD COLUMN "_event_uuid"   uuid;
ALTER TABLE "public"."chats"             ADD COLUMN "_event_uuid"   uuid;
ALTER TABLE "public"."chat_messages"     ADD COLUMN "_chat_uuid"    uuid;
ALTER TABLE "public"."event_sessions"    ADD COLUMN "_event_uuid"   uuid;
ALTER TABLE "public"."event_sessions"    ADD COLUMN "_ticket_uuid"  uuid;
ALTER TABLE "public"."matches"           ADD COLUMN "_event_uuid"   uuid;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2: Populate FK UUID columns by joining on old integer ids
-- ─────────────────────────────────────────────────────────────────────────

UPDATE "public"."venues" v
SET "_contact_uuid" = vc."_uuid"
FROM "public"."venue_contacts" vc
WHERE v.contact_id = vc.id;

UPDATE "public"."events" e
SET "_venue_uuid" = v."_uuid"
FROM "public"."venues" v
WHERE e.venue_id = v.id;

UPDATE "public"."tickets" t
SET "_event_uuid" = e."_uuid"
FROM "public"."events" e
WHERE t.event_id = e.id;

UPDATE "public"."event_engagements" ee
SET "_event_uuid" = e."_uuid"
FROM "public"."events" e
WHERE ee.event_id = e.id;

UPDATE "public"."chats" c
SET "_event_uuid" = e."_uuid"
FROM "public"."events" e
WHERE c.event_id = e.id;

UPDATE "public"."chat_messages" cm
SET "_chat_uuid" = c."_uuid"
FROM "public"."chats" c
WHERE cm.chat_id = c.id;

UPDATE "public"."event_sessions" es
SET "_event_uuid" = e."_uuid"
FROM "public"."events" e
WHERE es.event_id = e.id;

UPDATE "public"."event_sessions" es
SET "_ticket_uuid" = t."_uuid"
FROM "public"."tickets" t
WHERE es.ticket_id = t.id;

UPDATE "public"."matches" m
SET "_event_uuid" = e."_uuid"
FROM "public"."events" e
WHERE m.event_id = e.id;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3: Drop all FK constraints that reference the migrated tables
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."venues"            DROP CONSTRAINT "venues_contact_id_fkey";
ALTER TABLE "public"."events"            DROP CONSTRAINT "events_venue_id_fkey";
ALTER TABLE "public"."chats"             DROP CONSTRAINT "chats_event_id_fkey";
ALTER TABLE "public"."chats"             DROP CONSTRAINT "chats_match_id_fkey"; -- bigint match_id stays; will be re-added
ALTER TABLE "public"."event_engagements" DROP CONSTRAINT "event_engagements_event_id_fkey";
ALTER TABLE "public"."event_sessions"    DROP CONSTRAINT "event_sessions_event_id_fkey";
ALTER TABLE "public"."event_sessions"    DROP CONSTRAINT "event_sessions_ticket_id_fkey";
ALTER TABLE "public"."matches"           DROP CONSTRAINT "matches_event_id_fkey";
ALTER TABLE "public"."tickets"           DROP CONSTRAINT "tickets_event_id_fkey";
ALTER TABLE "public"."chat_messages"     DROP CONSTRAINT "chat_messages_chat_id_fkey";

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4: Drop PK constraints on the migrated tables
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."venue_contacts"    DROP CONSTRAINT "venue_contacts_pkey";
ALTER TABLE "public"."venues"            DROP CONSTRAINT "venues_pkey";
ALTER TABLE "public"."events"            DROP CONSTRAINT "events_pkey";
ALTER TABLE "public"."tickets"           DROP CONSTRAINT "tickets_pkey";
ALTER TABLE "public"."event_engagements" DROP CONSTRAINT "event_engagements_pkey";
ALTER TABLE "public"."chats"             DROP CONSTRAINT "chats_pkey";
ALTER TABLE "public"."chat_messages"     DROP CONSTRAINT "chat_messages_pkey";

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4b: Drop RLS policies that reference columns being dropped
-- The venue_contacts policy references venue_contacts.id directly.
-- The events policies reference venues.id and events.venue_id in subqueries.
-- PostgreSQL tracks these cross-table column OID dependencies and will refuse
-- to drop the columns unless the dependent policies are dropped first.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Hosts can manage own venue contacts" ON "public"."venue_contacts";
DROP POLICY IF EXISTS "Anyone can view venue contacts"      ON "public"."venue_contacts";

DROP POLICY IF EXISTS "Anyone can view active events"             ON "public"."events";
DROP POLICY IF EXISTS "Hosts can create events for their venues"  ON "public"."events";
DROP POLICY IF EXISTS "Hosts can delete own venue events"         ON "public"."events";
DROP POLICY IF EXISTS "Hosts can update own venue events"         ON "public"."events";
DROP POLICY IF EXISTS "Service role can manage all events"        ON "public"."events";

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 5: Swap PK columns (drop bigint id, rename _uuid → id, add PK + default)
-- NOTE: dropping a column that is part of unique constraints or indexes
--       automatically drops those objects; they are recreated in Step 9/10.
-- ─────────────────────────────────────────────────────────────────────────

-- venue_contacts
ALTER TABLE "public"."venue_contacts" DROP COLUMN "id";
ALTER TABLE "public"."venue_contacts" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."venue_contacts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."venue_contacts" ADD CONSTRAINT "venue_contacts_pkey" PRIMARY KEY ("id");

-- venues
ALTER TABLE "public"."venues" DROP COLUMN "id";
ALTER TABLE "public"."venues" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."venues" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."venues" ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");

-- events
ALTER TABLE "public"."events" DROP COLUMN "id";
ALTER TABLE "public"."events" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."events" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");

-- tickets
ALTER TABLE "public"."tickets" DROP COLUMN "id";
ALTER TABLE "public"."tickets" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."tickets" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");

-- event_engagements
ALTER TABLE "public"."event_engagements" DROP COLUMN "id";
ALTER TABLE "public"."event_engagements" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."event_engagements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."event_engagements" ADD CONSTRAINT "event_engagements_pkey" PRIMARY KEY ("id");

-- chats
ALTER TABLE "public"."chats" DROP COLUMN "id";
ALTER TABLE "public"."chats" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."chats" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."chats" ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");

-- chat_messages
ALTER TABLE "public"."chat_messages" DROP COLUMN "id";
ALTER TABLE "public"."chat_messages" RENAME COLUMN "_uuid" TO "id";
ALTER TABLE "public"."chat_messages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 6: Swap FK columns (drop old bigint FK col, rename _xxx_uuid → original name)
-- ─────────────────────────────────────────────────────────────────────────

-- venues.contact_id (nullable)
ALTER TABLE "public"."venues" DROP COLUMN "contact_id";
ALTER TABLE "public"."venues" RENAME COLUMN "_contact_uuid" TO "contact_id";

-- events.venue_id (NOT NULL)
ALTER TABLE "public"."events" DROP COLUMN "venue_id";
ALTER TABLE "public"."events" RENAME COLUMN "_venue_uuid" TO "venue_id";
ALTER TABLE "public"."events" ALTER COLUMN "venue_id" SET NOT NULL;

-- tickets.event_id (NOT NULL)
ALTER TABLE "public"."tickets" DROP COLUMN "event_id";
ALTER TABLE "public"."tickets" RENAME COLUMN "_event_uuid" TO "event_id";
ALTER TABLE "public"."tickets" ALTER COLUMN "event_id" SET NOT NULL;

-- event_engagements.event_id (NOT NULL)
ALTER TABLE "public"."event_engagements" DROP COLUMN "event_id";
ALTER TABLE "public"."event_engagements" RENAME COLUMN "_event_uuid" TO "event_id";
ALTER TABLE "public"."event_engagements" ALTER COLUMN "event_id" SET NOT NULL;

-- chats.event_id (NOT NULL)
ALTER TABLE "public"."chats" DROP COLUMN "event_id";
ALTER TABLE "public"."chats" RENAME COLUMN "_event_uuid" TO "event_id";
ALTER TABLE "public"."chats" ALTER COLUMN "event_id" SET NOT NULL;

-- chat_messages.chat_id (NOT NULL)
ALTER TABLE "public"."chat_messages" DROP COLUMN "chat_id";
ALTER TABLE "public"."chat_messages" RENAME COLUMN "_chat_uuid" TO "chat_id";
ALTER TABLE "public"."chat_messages" ALTER COLUMN "chat_id" SET NOT NULL;

-- event_sessions.event_id (NOT NULL)
ALTER TABLE "public"."event_sessions" DROP COLUMN "event_id";
ALTER TABLE "public"."event_sessions" RENAME COLUMN "_event_uuid" TO "event_id";
ALTER TABLE "public"."event_sessions" ALTER COLUMN "event_id" SET NOT NULL;

-- event_sessions.ticket_id (nullable)
ALTER TABLE "public"."event_sessions" DROP COLUMN "ticket_id";
ALTER TABLE "public"."event_sessions" RENAME COLUMN "_ticket_uuid" TO "ticket_id";

-- matches.event_id (NOT NULL)
ALTER TABLE "public"."matches" DROP COLUMN "event_id";
ALTER TABLE "public"."matches" RENAME COLUMN "_event_uuid" TO "event_id";
ALTER TABLE "public"."matches" ALTER COLUMN "event_id" SET NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 7: Drop orphaned integer sequences (dropped column took the identity
--         attachment with it, but explicit sequences may still exist)
-- ─────────────────────────────────────────────────────────────────────────

DROP SEQUENCE IF EXISTS "public"."venue_contacts_id_seq";
DROP SEQUENCE IF EXISTS "public"."venues_id_seq";
DROP SEQUENCE IF EXISTS "public"."events_id_seq";
DROP SEQUENCE IF EXISTS "public"."tickets_id_seq";
DROP SEQUENCE IF EXISTS "public"."event_engagements_id_seq";
DROP SEQUENCE IF EXISTS "public"."chats_id_seq";
DROP SEQUENCE IF EXISTS "public"."chat_messages_id_seq";

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 8: Recreate all FK constraints (columns are now uuid ↔ uuid)
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."venues"
    ADD CONSTRAINT "venues_contact_id_fkey"
    FOREIGN KEY ("contact_id") REFERENCES "public"."venue_contacts"("id") ON DELETE SET NULL;

ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_venue_id_fkey"
    FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;

ALTER TABLE "public"."chats"
    ADD CONSTRAINT "chats_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE "public"."chats"
    ADD CONSTRAINT "chats_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;

ALTER TABLE "public"."event_engagements"
    ADD CONSTRAINT "event_engagements_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE "public"."event_sessions"
    ADD CONSTRAINT "event_sessions_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE "public"."event_sessions"
    ADD CONSTRAINT "event_sessions_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;

ALTER TABLE "public"."matches"
    ADD CONSTRAINT "matches_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE "public"."tickets"
    ADD CONSTRAINT "tickets_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;

ALTER TABLE "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_chat_id_fkey"
    FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 9: Recreate unique constraints auto-dropped with the old FK columns
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_title_venue_start_unique"
    UNIQUE ("title", "venue_id", "start_date_time");

ALTER TABLE "public"."event_engagements"
    ADD CONSTRAINT "event_engagements_user_event_type_unique"
    UNIQUE ("user_id", "event_id", "engagement_type");

ALTER TABLE "public"."matches"
    ADD CONSTRAINT "matches_unique_pair"
    UNIQUE ("guest_id_1", "guest_id_2", "event_id");

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 10: Recreate indexes auto-dropped with the old FK columns
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX "event_engagements_event_id_idx"
    ON "public"."event_engagements" USING btree ("event_id");

CREATE INDEX "event_engagements_event_type_idx"
    ON "public"."event_engagements" USING btree ("event_id", "engagement_type");

CREATE INDEX "event_sessions_event_id_idx"
    ON "public"."event_sessions" USING btree ("event_id");

CREATE INDEX "event_sessions_user_event_idx"
    ON "public"."event_sessions" USING btree ("user_id", "event_id");

CREATE INDEX "event_sessions_active_idx"
    ON "public"."event_sessions" USING btree ("event_id", "user_id")
    WHERE (exited_at IS NULL);

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 10b: Recreate RLS policies dropped in Step 4b
-- ─────────────────────────────────────────────────────────────────────────

-- venue_contacts policies
CREATE POLICY "Hosts can manage own venue contacts" ON "public"."venue_contacts"
    USING (
        EXISTS (
            SELECT 1 FROM "public"."venues"
            WHERE "venues"."contact_id" = "venue_contacts"."id"
              AND ("auth"."uid"())::"text" = "venues"."host_id"
        )
    )
    WITH CHECK (true);

CREATE POLICY "Anyone can view venue contacts" ON "public"."venue_contacts"
    FOR SELECT USING (true);

-- events policies (venue_id and venues.id are now both uuid — same logic applies)
CREATE POLICY "Anyone can view active events" ON "public"."events"
    FOR SELECT USING (
        ("status" = 'active'::"public"."event_status_enum")
        OR (("auth"."uid"())::"text" IN (
            SELECT "venues"."host_id" FROM "public"."venues"
            WHERE "venues"."id" = "events"."venue_id"
        ))
    );

CREATE POLICY "Hosts can create events for their venues" ON "public"."events"
    FOR INSERT WITH CHECK (
        ("auth"."uid"())::"text" IN (
            SELECT "venues"."host_id" FROM "public"."venues"
            WHERE "venues"."id" = "events"."venue_id"
        )
    );

CREATE POLICY "Hosts can delete own venue events" ON "public"."events"
    FOR DELETE USING (
        ("auth"."uid"())::"text" IN (
            SELECT "venues"."host_id" FROM "public"."venues"
            WHERE "venues"."id" = "events"."venue_id"
        )
    );

CREATE POLICY "Hosts can update own venue events" ON "public"."events"
    FOR UPDATE
    USING (
        ("auth"."uid"())::"text" IN (
            SELECT "venues"."host_id" FROM "public"."venues"
            WHERE "venues"."id" = "events"."venue_id"
        )
    )
    WITH CHECK (
        ("auth"."uid"())::"text" IN (
            SELECT "venues"."host_id" FROM "public"."venues"
            WHERE "venues"."id" = "events"."venue_id"
        )
    );

CREATE POLICY "Service role can manage all events" ON "public"."events"
    TO "service_role" USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 11: Replace get_engagement_chart_data (signature: integer[] → uuid[])
-- ─────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS "public"."get_engagement_chart_data"(integer[], integer);

CREATE OR REPLACE FUNCTION "public"."get_engagement_chart_data"(
    "p_venue_ids" uuid[],
    "p_event_id"  uuid DEFAULT NULL::uuid
) RETURNS TABLE("date" date, "views" bigint, "bookmarks" bigint, "attended" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - INTERVAL '90 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS date
  ),

  views_data AS (
    SELECT
      ee.created_at::date AS date,
      COUNT(*) AS views
    FROM public.event_engagements ee
    JOIN public.events e ON e.id = ee.event_id
    WHERE ee.engagement_type = 'seen'
      AND e.venue_id = ANY(p_venue_ids)
      AND (p_event_id IS NULL OR ee.event_id = p_event_id)
      AND ee.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY ee.created_at::date
  ),

  bookmarks_data AS (
    SELECT
      ee.created_at::date AS date,
      COUNT(*) AS bookmarks
    FROM public.event_engagements ee
    JOIN public.events e ON e.id = ee.event_id
    WHERE ee.engagement_type = 'saved'
      AND e.venue_id = ANY(p_venue_ids)
      AND (p_event_id IS NULL OR ee.event_id = p_event_id)
      AND ee.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY ee.created_at::date
  ),

  attended_data AS (
    SELECT
      es.entered_at::date AS date,
      COUNT(DISTINCT es.user_id) AS attended
    FROM public.event_sessions es
    JOIN public.events e ON e.id = es.event_id
    WHERE es.entered_at IS NOT NULL
      AND e.venue_id = ANY(p_venue_ids)
      AND (p_event_id IS NULL OR es.event_id = p_event_id)
      AND es.entered_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY es.entered_at::date
  )

  SELECT
    ds.date,
    COALESCE(v.views, 0)      AS views,
    COALESCE(b.bookmarks, 0)  AS bookmarks,
    COALESCE(a.attended, 0)   AS attended
  FROM date_series ds
  LEFT JOIN views_data    v ON v.date = ds.date
  LEFT JOIN bookmarks_data b ON b.date = ds.date
  LEFT JOIN attended_data  a ON a.date = ds.date
  ORDER BY ds.date;
END;
$$;

GRANT ALL ON FUNCTION "public"."get_engagement_chart_data"(uuid[], uuid) TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_chart_data"(uuid[], uuid) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_chart_data"(uuid[], uuid) TO "service_role";

COMMIT;
