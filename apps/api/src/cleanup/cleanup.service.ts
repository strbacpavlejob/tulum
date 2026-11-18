import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { parseDbTimestamp, toUtcIsoString } from '../common/db-timestamp';
import { isMissingTableOrColumn } from '../common/missing-schema';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Matches are archived, never deleted: archived_at takes them out of the
 * guests' inboxes (GET /matches/mine), and the match, its chat and messages
 * stay in the database. Guests keep their matches for the native app, and
 * reports can still be looked into.
 */

/** How many events deleteOldEvents checks for matches at once. */
const MATCH_CHECK_BATCH = 20;

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Returns what would be archived — match ids grouped by expired event.
   * Changes nothing.
   */
  async previewExpiredMatches() {
    const now = new Date().toISOString();

    // Read whole (*), so this works before and after the migration that adds
    // archived_at.
    const { data, error } = await this.db
      .from('matches')
      .select(
        `
        *,
        event:events!matches_event_id_fkey(id, title, end_date_time)
      `,
      )
      .lt('events.end_date_time', now);

    if (error) throw error;

    // Filter in JS — PostgREST doesn't apply the lt filter on a joined column
    // so we filter the result set explicitly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expired = (data ?? []).filter((m: any) => {
      const endDt = m.event?.end_date_time;
      return !m.archived_at && endDt && parseDbTimestamp(endDt) < new Date();
    });

    // Group by event for a clear summary
    const byEvent = new Map<
      number,
      {
        event_id: number;
        event_title: string;
        end_date_time: string | null;
        match_ids: number[];
      }
    >();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const m of expired as any[]) {
      const eid = m.event_id as number;
      if (!byEvent.has(eid)) {
        byEvent.set(eid, {
          event_id: eid,
          event_title: (m.event?.title ?? '') as string,
          end_date_time: toUtcIsoString(m.event?.end_date_time),
          match_ids: [],
        });
      }
      byEvent.get(eid)!.match_ids.push(m.id as number);
    }

    return {
      total_matches: expired.length,
      events: Array.from(byEvent.values()),
    };
  }

  /**
   * Archives the matches of events whose end_date_time is in the past.
   *
   * Returns counts of what was archived.
   */
  async cleanupExpiredMatches() {
    // 1. Find expired event ids
    const now = new Date().toISOString();
    const { data: expiredEvents, error: evErr } = await this.db
      .from('events')
      .select('id')
      .lt('end_date_time', now);
    if (evErr) throw evErr;

    if (!expiredEvents || expiredEvents.length === 0) {
      return { archived_matches: 0, events_affected: [] };
    }

    const expiredEventIds = expiredEvents.map((e) => e.id as string);
    const archived = await this.archiveMatches(expiredEventIds);

    return {
      archived_matches: archived,
      events_affected: expiredEventIds,
    };
  }

  /** Archives the matches of one event. */
  async cleanupMatchesForEvent(eventId: string) {
    return {
      event_id: eventId,
      archived_matches: await this.archiveMatches([eventId]),
    };
  }

  /** Sets archived_at on the events' matches that aren't archived yet. */
  private async archiveMatches(eventIds: string[]): Promise<number> {
    const { data, error } = await this.db
      .from('matches')
      .update({ archived_at: new Date().toISOString() })
      .in('event_id', eventIds)
      .is('archived_at', null)
      .select('id');
    if (error) {
      // Never fall back to deleting.
      if (isMissingTableOrColumn(error)) {
        throw new ServiceUnavailableException(
          'matches.archived_at is missing: apply the archive migration first',
        );
      }
      throw error;
    }
    return (data ?? []).length;
  }

  /**
   * Deletes the events that ended before the cutoff (now by default) and
   * have no match. An event with a match stays, with its matches, chats and
   * messages: those are archived, never deleted, and deleting the event
   * would cascade to them. Returns how many events went.
   */
  async deleteOldEvents(before?: string): Promise<number> {
    const cutoff = before ?? new Date().toISOString();

    const { data: oldEvents, error: oldEventsError } = await this.db
      .from('events')
      .select('id')
      .lt('end_date_time', cutoff);

    if (oldEventsError) {
      this.logger.error('Error selecting old events:', oldEventsError.message);
      throw new Error(`Failed to select old events: ${oldEventsError.message}`);
    }

    const pastIds = (oldEvents ?? []).map((e) => e.id as string);
    const withMatches = await this.eventsWithMatches(pastIds);
    if (withMatches.size > 0) {
      this.logger.log(
        `Keeping ${withMatches.size} events with matches that ended before ${cutoff}`,
      );
    }

    const eventIds = pastIds.filter((id) => !withMatches.has(id));
    if (eventIds.length === 0) {
      this.logger.log(`Deleted 0 events with end_date_time before ${cutoff}`);
      return 0;
    }

    const { data: chats, error: chatsError } = await this.db
      .from('chats')
      .select('id')
      .in('event_id', eventIds);

    if (chatsError) {
      this.logger.error(
        'Error selecting chats for old events:',
        chatsError.message,
      );
      throw new Error(`Failed to select old chats: ${chatsError.message}`);
    }

    const chatIds = (chats ?? []).map((c) => c.id as string);

    if (chatIds.length > 0) {
      const { error: deleteMessagesError } = await this.db
        .from('chat_messages')
        .delete()
        .in('chat_id', chatIds);

      if (deleteMessagesError) {
        this.logger.error(
          'Error deleting chat messages for old events:',
          deleteMessagesError.message,
        );
        throw new Error(
          `Failed to delete old chat messages: ${deleteMessagesError.message}`,
        );
      }

      const { error: deleteChatsError } = await this.db
        .from('chats')
        .delete()
        .in('id', chatIds);

      if (deleteChatsError) {
        this.logger.error(
          'Error deleting chats for old events:',
          deleteChatsError.message,
        );
        throw new Error(
          `Failed to delete old chats: ${deleteChatsError.message}`,
        );
      }
    }

    const { data, error } = await this.db
      .from('events')
      .delete()
      .in('id', eventIds)
      .select('id');

    if (error) {
      this.logger.error('Error deleting old events:', error.message);
      throw new Error(`Failed to delete old events: ${error.message}`);
    }

    const count = data?.length ?? 0;
    this.logger.log(
      `Deleted ${count} events with end_date_time before ${cutoff}`,
    );
    return count;
  }

  /**
   * The events among these that have a match, archived or not. One small
   * query per event, MATCH_CHECK_BATCH at a time: a single query over all of
   * their matches could be cut off at PostgREST's row limit.
   */
  private async eventsWithMatches(eventIds: string[]): Promise<Set<string>> {
    const withMatches = new Set<string>();

    for (let i = 0; i < eventIds.length; i += MATCH_CHECK_BATCH) {
      const batch = eventIds.slice(i, i + MATCH_CHECK_BATCH);
      const found = await Promise.all(
        batch.map(async (eventId) => {
          const { data, error } = await this.db
            .from('matches')
            .select('id')
            .eq('event_id', eventId)
            .limit(1);

          if (error) {
            this.logger.error(
              'Error checking matches of old events:',
              error.message,
            );
            throw new Error(
              `Failed to check matches of old events: ${error.message}`,
            );
          }

          return (data ?? []).length > 0 ? eventId : null;
        }),
      );

      for (const eventId of found) {
        if (eventId) withMatches.add(eventId);
      }
    }

    return withMatches;
  }
}
