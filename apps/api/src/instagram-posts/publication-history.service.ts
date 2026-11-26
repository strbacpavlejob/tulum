import { Injectable } from '@nestjs/common';
import { isMissingTableOrColumn } from '../common/missing-schema';
import { SupabaseService } from '../supabase/supabase.service';

/*
 * The history of what Tulum's Instagram promoted, shared by the Stories and
 * the weekly posts: an event is promoted once, in a story or in a post
 * (migrations/20261126213507_social_media_publications.sql).
 */

const TABLE = 'social_media_publications';

/* Tulum's Instagram is the only account the API posts on so far. */
const PLATFORM = 'instagram';

/* Instagram's errors can be long; the column takes 1,000 characters. */
const MAX_ERROR_LENGTH = 500;

/* What happened to a post is written after Instagram has answered, so a
 * write that fails is tried again, after 1 and then 2 seconds. */
const WRITE_TRIES = 3;
const WRITE_RETRY_MS = 1_000;

export type PublicationFormat = 'story' | 'feed';

export type PublicationStatus = 'publishing' | 'published' | 'unknown';

/** An event a story or post shows, is about to show, or may have shown. */
export interface Publication {
  eventId: string;
  title: string;
  venueId: string;
  format: PublicationFormat;
  status: PublicationStatus;
  runKey: string;
  createdAt: string;
}

/** The table isn't there yet: its migration isn't applied. */
export class PublicationHistoryMissingError extends Error {
  constructor() {
    super(
      'social_media_publications is missing: apply migrations/20261126213507_social_media_publications.sql',
    );
  }
}

interface PublicationRow {
  event_id: string;
  format: PublicationFormat;
  status: PublicationStatus;
  run_key: string;
  created_at: string;
  events: { title: string; venue_id: string } | null;
}

const PUBLICATION_COLUMNS =
  'event_id, format, status, run_key, created_at, events!inner(title, venue_id)';

@Injectable()
export class PublicationHistoryService {
  /* Waits between a write's tries; the specs replace it. */
  private sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /** The promoted events that start from `from` until `until`. */
  async promotedEvents(from: Date, until: Date): Promise<Publication[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select(PUBLICATION_COLUMNS)
      .eq('platform', PLATFORM)
      .gte('events.start_date_time', from.toISOString())
      .lt('events.start_date_time', until.toISOString());
    if (error) throw historyError(error, 'read the promoted events');
    return toPublications(data);
  }

  /** The stories made since `since`, newest first. */
  async storiesSince(since: Date): Promise<Publication[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select(PUBLICATION_COLUMNS)
      .eq('platform', PLATFORM)
      .eq('format', 'story')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (error) throw historyError(error, 'read the recent stories');
    return toPublications(data);
  }

  /**
   * Whether a run whose key starts with runKeyPrefix has claimed, published
   * or maybe published anything, e.g. "story:2026-11-27T10:00:" for any
   * run of that slot. Failed runs leave nothing.
   */
  async hasRun(runKeyPrefix: string): Promise<boolean> {
    const { count, error } = await this.db
      .from(TABLE)
      .select('event_id', { count: 'exact', head: true })
      .eq('platform', PLATFORM)
      .like('run_key', `${runKeyPrefix}%`);
    if (error) throw historyError(error, 'look up the runs');
    return (count ?? 0) > 0;
  }

  /**
   * Claims events for a run that is about to publish them, and returns the
   * ones it got: an event another run has claimed or promoted is left out.
   * The table's unique key makes the claim atomic.
   */
  async claim(
    eventIds: readonly string[],
    format: PublicationFormat,
    runKey: string,
  ): Promise<Set<string>> {
    if (eventIds.length === 0) return new Set();
    const { data, error } = await this.db
      .from(TABLE)
      .upsert(
        eventIds.map((eventId) => ({
          event_id: eventId,
          platform: PLATFORM,
          format,
          status: 'publishing',
          run_key: runKey,
        })),
        { onConflict: 'event_id,platform', ignoreDuplicates: true },
      )
      .select('event_id');
    if (error) throw historyError(error, 'claim the events');
    return new Set(
      ((data ?? []) as { event_id: string }[]).map((row) => row.event_id),
    );
  }

  /** Instagram confirmed the post: the run's events are promoted. */
  async markPublished(
    eventIds: readonly string[],
    runKey: string,
    media: { mediaId: string; permalink: string | null },
    now = new Date(),
  ): Promise<void> {
    await this.updateClaims(eventIds, runKey, 'mark them published', {
      status: 'published',
      media_id: media.mediaId,
      permalink: media.permalink,
      published_at: now.toISOString(),
    });
  }

  /** The post may have gone out: its events stay claimed, for good. */
  async markUnknown(
    eventIds: readonly string[],
    runKey: string,
    error: string,
  ): Promise<void> {
    await this.updateClaims(eventIds, runKey, 'mark them unknown', {
      status: 'unknown',
      error: error.slice(0, MAX_ERROR_LENGTH),
    });
  }

  /** Nothing went out: the run's claims go, and the events can be promoted later. */
  async release(eventIds: readonly string[], runKey: string): Promise<void> {
    if (eventIds.length === 0) return;
    await this.withRetries(async () => {
      const { error } = await this.db
        .from(TABLE)
        .delete()
        .eq('platform', PLATFORM)
        .eq('run_key', runKey)
        .eq('status', 'publishing')
        .in('event_id', [...eventIds]);
      if (error) throw historyError(error, 'release the events');
    });
  }

  private async updateClaims(
    eventIds: readonly string[],
    runKey: string,
    what: string,
    values: Record<string, string | null>,
  ): Promise<void> {
    if (eventIds.length === 0) return;
    await this.withRetries(async () => {
      const { error } = await this.db
        .from(TABLE)
        .update(values)
        .eq('platform', PLATFORM)
        .eq('run_key', runKey)
        .eq('status', 'publishing')
        .in('event_id', [...eventIds]);
      if (error) throw historyError(error, what);
    });
  }

  /* A missing table won't appear between tries, so it is final. */
  private async withRetries(write: () => Promise<void>): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await write();
      } catch (error) {
        if (
          attempt >= WRITE_TRIES ||
          error instanceof PublicationHistoryMissingError
        ) {
          throw error;
        }
        await this.sleep(WRITE_RETRY_MS * attempt);
      }
    }
  }
}

function toPublications(data: unknown): Publication[] {
  return ((data ?? []) as unknown as PublicationRow[]).flatMap(
    (row): Publication[] =>
      row.events
        ? [
            {
              eventId: row.event_id,
              title: row.events.title,
              venueId: row.events.venue_id,
              format: row.format,
              status: row.status,
              runKey: row.run_key,
              createdAt: row.created_at,
            },
          ]
        : [],
  );
}

function historyError(
  error: { code?: string; message: string },
  what: string,
): Error {
  return isMissingTableOrColumn(error)
    ? new PublicationHistoryMissingError()
    : new Error(`Couldn't ${what} in ${TABLE}: ${error.message}`);
}
