


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."event_status_enum" AS ENUM (
    'draft',
    'active',
    'cancelled'
);


ALTER TYPE "public"."event_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."gender_enum" AS ENUM (
    'male',
    'female',
    'other'
);


ALTER TYPE "public"."gender_enum" OWNER TO "postgres";


CREATE TYPE "public"."language_enum" AS ENUM (
    'EN',
    'SR',
    'RU'
);


ALTER TYPE "public"."language_enum" OWNER TO "postgres";


CREATE TYPE "public"."seeking_enum" AS ENUM (
    'casual',
    'relationship',
    'friendship',
    'party'
);


ALTER TYPE "public"."seeking_enum" OWNER TO "postgres";


CREATE TYPE "public"."theme_enum" AS ENUM (
    'dark',
    'light',
    'system'
);


ALTER TYPE "public"."theme_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_mode_enum" AS ENUM (
    'transfer',
    'purchase'
);


ALTER TYPE "public"."transaction_mode_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status_enum" AS ENUM (
    'pending',
    'completed',
    'failed'
);


ALTER TYPE "public"."transaction_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."venue_type_enum" AS ENUM (
    'bar',
    'pub',
    'nightclub',
    'restaurant',
    'cafe',
    'cocktail_bar',
    'wine_bar',
    'brewery',
    'tavern',
    'raft'
);


ALTER TYPE "public"."venue_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_engagement_chart_data"("p_venue_ids" integer[], "p_event_id" integer DEFAULT NULL::integer) RETURNS TABLE("date" "date", "views" bigint, "bookmarks" bigint, "attended" bigint)
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
    COALESCE(v.views, 0) AS views,
    COALESCE(b.bookmarks, 0) AS bookmarks,
    COALESCE(a.attended, 0) AS attended
  FROM date_series ds
  LEFT JOIN views_data v ON v.date = ds.date
  LEFT JOIN bookmarks_data b ON b.date = ds.date
  LEFT JOIN attended_data a ON a.date = ds.date
  ORDER BY ds.date;
END;
$$;


ALTER FUNCTION "public"."get_engagement_chart_data"("p_venue_ids" integer[], "p_event_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_engagement_chart_data"("p_venue_ids" integer[], "p_event_id" integer) IS 'Returns engagement metrics (views, bookmarks, attended) aggregated by date for the last 90 days. 
Can be filtered by venue_ids and optionally by a specific event_id.';



CREATE OR REPLACE FUNCTION "public"."requesting_user_id"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::text;
$$;


ALTER FUNCTION "public"."requesting_user_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" bigint NOT NULL,
    "chat_id" bigint NOT NULL,
    "sender_id" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."chat_messages" IS 'Individual messages in chat sessions';



ALTER TABLE "public"."chat_messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chat_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" bigint NOT NULL,
    "match_id" bigint NOT NULL,
    "event_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


COMMENT ON TABLE "public"."chats" IS 'Chat sessions between matched guests';



ALTER TABLE "public"."chats" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."chats_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_engagements" (
    "id" bigint NOT NULL,
    "user_id" "text" NOT NULL,
    "event_id" bigint NOT NULL,
    "engagement_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_engagements_type_check" CHECK (("engagement_type" = ANY (ARRAY['seen'::"text", 'saved'::"text"])))
);


ALTER TABLE "public"."event_engagements" OWNER TO "postgres";


ALTER TABLE "public"."event_engagements" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."event_engagements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_sessions" (
    "id" bigint NOT NULL,
    "user_id" "text" NOT NULL,
    "event_id" bigint NOT NULL,
    "ticket_id" bigint,
    "entered_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "exited_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_sessions_exit_after_entry_check" CHECK ((("exited_at" IS NULL) OR ("exited_at" >= "entered_at")))
);


ALTER TABLE "public"."event_sessions" OWNER TO "postgres";


ALTER TABLE "public"."event_sessions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."event_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" bigint NOT NULL,
    "venue_id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "start_date_time" timestamp without time zone NOT NULL,
    "end_date_time" timestamp without time zone NOT NULL,
    "tags" "text"[] NOT NULL,
    "status" "public"."event_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "picture_url" "text"
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Events hosted at venues';



ALTER TABLE "public"."events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."guests" (
    "user_id" "text" NOT NULL,
    "gender" "public"."gender_enum",
    "seeking" "public"."seeking_enum",
    "interested_in" "public"."gender_enum"[] NOT NULL,
    "interests" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "picture_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "birthday" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


COMMENT ON TABLE "public"."guests" IS 'Guest user profiles extending users table';



CREATE TABLE IF NOT EXISTS "public"."hosts" (
    "user_id" "text" NOT NULL
);


ALTER TABLE "public"."hosts" OWNER TO "postgres";


COMMENT ON TABLE "public"."hosts" IS 'Host user profiles extending users table';



CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" bigint NOT NULL,
    "guest_id_1" "text" NOT NULL,
    "guest_id_2" "text" NOT NULL,
    "event_id" bigint NOT NULL,
    "matched_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "matches_different_guests" CHECK (("guest_id_1" <> "guest_id_2"))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


COMMENT ON TABLE "public"."matches" IS 'Guest matches made at events';



ALTER TABLE "public"."matches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."matches_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "user_id" "text" NOT NULL,
    "language" "public"."language_enum" NOT NULL,
    "theme" "public"."theme_enum" NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" bigint NOT NULL,
    "event_id" bigint NOT NULL,
    "guest_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON TABLE "public"."tickets" IS 'Event tickets purchased by guests';



ALTER TABLE "public"."tickets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tickets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" DEFAULT "public"."requesting_user_id"() NOT NULL,
    "email" "text" NOT NULL,
    "username" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "push_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Base user information table';



CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" bigint NOT NULL,
    "host_id" "text" NOT NULL,
    "venue_type" "public"."venue_type_enum" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "address" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "capacity" integer,
    "picture_url" "text",
    "scraper" "text",
    "instagram_url" "text"
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


COMMENT ON TABLE "public"."venues" IS 'Venue information managed by hosts';



ALTER TABLE "public"."venues" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."venues_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_unique_match" UNIQUE ("match_id");



ALTER TABLE ONLY "public"."event_engagements"
    ADD CONSTRAINT "event_engagements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_engagements"
    ADD CONSTRAINT "event_engagements_user_event_type_unique" UNIQUE ("user_id", "event_id", "engagement_type");



ALTER TABLE ONLY "public"."event_sessions"
    ADD CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_title_venue_start_unique" UNIQUE ("title", "venue_id", "start_date_time");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."hosts"
    ADD CONSTRAINT "hosts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_unique_pair" UNIQUE ("guest_id_1", "guest_id_2", "event_id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



CREATE INDEX "event_engagements_event_id_idx" ON "public"."event_engagements" USING "btree" ("event_id");



CREATE INDEX "event_engagements_event_type_idx" ON "public"."event_engagements" USING "btree" ("event_id", "engagement_type");



CREATE INDEX "event_engagements_user_id_idx" ON "public"."event_engagements" USING "btree" ("user_id");



CREATE INDEX "event_engagements_user_type_idx" ON "public"."event_engagements" USING "btree" ("user_id", "engagement_type");



CREATE INDEX "event_sessions_active_idx" ON "public"."event_sessions" USING "btree" ("event_id", "user_id") WHERE ("exited_at" IS NULL);



CREATE INDEX "event_sessions_event_id_idx" ON "public"."event_sessions" USING "btree" ("event_id");



CREATE INDEX "event_sessions_user_event_idx" ON "public"."event_sessions" USING "btree" ("user_id", "event_id");



CREATE INDEX "event_sessions_user_id_idx" ON "public"."event_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_events_picture_url" ON "public"."events" USING "btree" ("picture_url") WHERE ("picture_url" IS NOT NULL);



CREATE INDEX "idx_venues_picture_url" ON "public"."venues" USING "btree" ("picture_url") WHERE ("picture_url" IS NOT NULL);



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."guests"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_engagements"
    ADD CONSTRAINT "event_engagements_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_engagements"
    ADD CONSTRAINT "event_engagements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_sessions"
    ADD CONSTRAINT "event_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_sessions"
    ADD CONSTRAINT "event_sessions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_sessions"
    ADD CONSTRAINT "event_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hosts"
    ADD CONSTRAINT "hosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_guest_id_1_fkey" FOREIGN KEY ("guest_id_1") REFERENCES "public"."guests"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_guest_id_2_fkey" FOREIGN KEY ("guest_id_2") REFERENCES "public"."guests"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."hosts"("user_id");



CREATE POLICY "Anyone can view active events" ON "public"."events" FOR SELECT USING ((("status" = 'active'::"public"."event_status_enum") OR (("auth"."uid"())::"text" IN ( SELECT "venues"."host_id"
   FROM "public"."venues"
  WHERE ("venues"."id" = "events"."venue_id")))));



CREATE POLICY "Anyone can view venues" ON "public"."venues" FOR SELECT USING (true);



CREATE POLICY "Hosts can create events for their venues" ON "public"."events" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" IN ( SELECT "venues"."host_id"
   FROM "public"."venues"
  WHERE ("venues"."id" = "events"."venue_id"))));



CREATE POLICY "Hosts can create venues" ON "public"."venues" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "host_id"));



CREATE POLICY "Hosts can delete own venue events" ON "public"."events" FOR DELETE USING ((("auth"."uid"())::"text" IN ( SELECT "venues"."host_id"
   FROM "public"."venues"
  WHERE ("venues"."id" = "events"."venue_id"))));



CREATE POLICY "Hosts can delete own venues" ON "public"."venues" FOR DELETE USING ((("auth"."uid"())::"text" = "host_id"));



CREATE POLICY "Hosts can update own venue events" ON "public"."events" FOR UPDATE USING ((("auth"."uid"())::"text" IN ( SELECT "venues"."host_id"
   FROM "public"."venues"
  WHERE ("venues"."id" = "events"."venue_id")))) WITH CHECK ((("auth"."uid"())::"text" IN ( SELECT "venues"."host_id"
   FROM "public"."venues"
  WHERE ("venues"."id" = "events"."venue_id"))));



CREATE POLICY "Hosts can update own venues" ON "public"."venues" FOR UPDATE USING ((("auth"."uid"())::"text" = "host_id")) WITH CHECK ((("auth"."uid"())::"text" = "host_id"));



CREATE POLICY "Hosts can view own venues" ON "public"."venues" FOR SELECT USING ((("auth"."uid"())::"text" = "host_id"));



CREATE POLICY "Service role can manage all events" ON "public"."events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all hosts" ON "public"."hosts" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all users" ON "public"."users" TO "service_role" USING (true);



CREATE POLICY "Service role can manage all venues" ON "public"."venues" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create own host profile" ON "public"."hosts" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "Users can view own host profile" ON "public"."hosts" FOR SELECT USING ((("auth"."uid"())::"text" = "user_id"));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hosts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_engagement_chart_data"("p_venue_ids" integer[], "p_event_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_engagement_chart_data"("p_venue_ids" integer[], "p_event_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_engagement_chart_data"("p_venue_ids" integer[], "p_event_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."requesting_user_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."requesting_user_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."requesting_user_id"() TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chat_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON SEQUENCE "public"."chats_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."chats_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."chats_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_engagements" TO "anon";
GRANT ALL ON TABLE "public"."event_engagements" TO "authenticated";
GRANT ALL ON TABLE "public"."event_engagements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_engagements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_engagements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_engagements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_sessions" TO "anon";
GRANT ALL ON TABLE "public"."event_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_sessions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_sessions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."hosts" TO "anon";
GRANT ALL ON TABLE "public"."hosts" TO "authenticated";
GRANT ALL ON TABLE "public"."hosts" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON SEQUENCE "public"."matches_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."matches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."matches_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."venues" TO "anon";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "service_role";



GRANT ALL ON SEQUENCE "public"."venues_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."venues_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."venues_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







