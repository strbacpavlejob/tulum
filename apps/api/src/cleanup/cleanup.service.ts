import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { parseDbTimestamp, toUtcIsoString } from '../common/db-timestamp';
import { isMissingTableOrColumn } from '../common/missing-schema';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Matches are archived, never deleted: archived_at takes them out of the
 * guests' inboxes (GET /matches/mine), and the match, its chat and messages
 * stay in the database. Guests keep their matches for the native app, and
 * reports can still be looked into.
 */

@Injectable()
export class CleanupService {
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
}
