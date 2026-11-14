-- Migration: indexes on the foreign keys that have none.
--
-- The Supabase performance advisor lists these 8 foreign keys as unindexed
-- (checked 14 Nov 2026). Without an index, a lookup by the column reads the
-- whole table, and so does every delete or key change in the referenced
-- table, which has to find the rows that point at it. At Maskenbal the
-- chat and match tables grow by thousands of rows in an evening.
--
-- chat_messages gets (chat_id, sent_at) rather than chat_id alone: chats read
-- their messages in time order, and the inbox reads each chat's newest one,
-- so the same index serves the key and both orders.
--
-- The tables are small today, so each index takes well under a second; a
-- plain CREATE INDEX blocks writes to its table while it builds. Safe to
-- re-run.

BEGIN;

CREATE INDEX IF NOT EXISTS chat_messages_chat_id_sent_at_idx
  ON public.chat_messages USING btree (chat_id, sent_at);

CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx
  ON public.chat_messages USING btree (sender_id);

CREATE INDEX IF NOT EXISTS chats_event_id_idx
  ON public.chats USING btree (event_id);

CREATE INDEX IF NOT EXISTS event_sessions_ticket_id_idx
  ON public.event_sessions USING btree (ticket_id);

CREATE INDEX IF NOT EXISTS events_venue_id_idx
  ON public.events USING btree (venue_id);

CREATE INDEX IF NOT EXISTS matches_event_id_idx
  ON public.matches USING btree (event_id);

CREATE INDEX IF NOT EXISTS venues_contact_id_idx
  ON public.venues USING btree (contact_id);

CREATE INDEX IF NOT EXISTS venues_host_id_idx
  ON public.venues USING btree (host_id);

COMMIT;

-- Check after applying; expect 8 rows:
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'chat_messages_chat_id_sent_at_idx', 'chat_messages_sender_id_idx',
--     'chats_event_id_idx', 'event_sessions_ticket_id_idx',
--     'events_venue_id_idx', 'matches_event_id_idx',
--     'venues_contact_id_idx', 'venues_host_id_idx'
--   );
-- The advisor's "Unindexed foreign keys" warnings for these tables are gone.
