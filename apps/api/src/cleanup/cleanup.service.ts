import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CleanupService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Returns what would be deleted — match ids grouped by expired event.
   * Does NOT delete anything.
   */
  async previewExpiredMatches() {
    const now = new Date().toISOString();

    const { data, error } = await this.db
      .from('matches')
      .select(
        `
        id,
        event_id,
        matched_at,
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
      return endDt && new Date(endDt as string) < new Date();
    });

    // Group by event for a clear summary
    const byEvent = new Map<
      number,
      {
        event_id: number;
        event_title: string;
        end_date_time: string;
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
          end_date_time: m.event?.end_date_time as string,
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
   * Deletes all matches (and their cascaded chats + messages) for events
   * whose end_date_time is in the past.
   *
   * Returns counts of what was removed.
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
      return { deleted_matches: 0, events_affected: [] };
    }

    const expiredEventIds = expiredEvents.map((e) => e.id as number);

    // 2. Delete matches for those events — FK cascades to chats + chat_messages
    const { data: deletedMatches, error: delErr } = await this.db
      .from('matches')
      .delete()
      .in('event_id', expiredEventIds)
      .select('id');
    if (delErr) throw delErr;

    return {
      deleted_matches: (deletedMatches ?? []).length,
      events_affected: expiredEventIds,
    };
  }

  /**
   * Deletes all matches (and cascaded chats + messages) for a specific event.
   */
  async cleanupMatchesForEvent(eventId: number) {
    const { data: deletedMatches, error } = await this.db
      .from('matches')
      .delete()
      .eq('event_id', eventId)
      .select('id');
    if (error) throw error;

    return {
      event_id: eventId,
      deleted_matches: (deletedMatches ?? []).length,
    };
  }
}
