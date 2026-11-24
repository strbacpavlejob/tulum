import { describe, expect, it, jest } from '@jest/globals';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CleanupService } from './cleanup.service';

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: { message: string } | null };

/**
 * Just enough of supabase-js over in-memory tables for deleteOldEvents:
 * select or delete, then lt, eq, in and limit, then await. A delete
 * followed by select returns the deleted rows.
 */
function fakeDatabase(tables: Record<string, Row[]>) {
  const from = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let action: 'select' | 'delete' = 'select';
    let max = Infinity;
    const query = {
      select: () => query,
      delete: () => {
        action = 'delete';
        return query;
      },
      lt: (column: string, value: string) => {
        filters.push((row) => String(row[column]) < value);
        return query;
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => row[column] === value);
        return query;
      },
      in: (column: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[column]));
        return query;
      },
      limit: (n: number) => {
        max = n;
        return query;
      },
      then: (
        onfulfilled: (result: Result) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) => {
        const rows = tables[table] ?? [];
        const hits = rows.filter((row) => filters.every((f) => f(row)));
        if (action === 'delete') {
          tables[table] = rows.filter((row) => !hits.includes(row));
        }
        return Promise.resolve({
          data: hits.slice(0, max),
          error: null,
        }).then(onfulfilled, onrejected);
      },
    };
    return query;
  };
  return { getClient: () => ({ from }) } as unknown as SupabaseService;
}

const R2 = 'https://img.tulum-app.com';

/** An R2Service that deletes from a set of keys instead of the bucket. */
function fakeBucket(keys: string[], failOn: string[] = []) {
  const objects = new Set(keys);
  const deleteObject = jest.fn((key: string) => {
    if (failOn.includes(key)) return Promise.reject(new Error('R2 is down'));
    objects.delete(key);
    return Promise.resolve();
  });
  const r2 = {
    extractKeyFromUrl: (url: string) =>
      url.startsWith(`${R2}/`) ? url.slice(R2.length + 1) : null,
    deleteObject,
  } as unknown as R2Service;
  return { r2, objects, deleteObject };
}

const ENDED = '2026-11-01T22:00:00';
const LATER = '2026-12-20T22:00:00';
const CUTOFF = '2026-11-18T12:00:00';

describe('CleanupService.deleteOldEvents', () => {
  it('deletes past events without matches and keeps those with matches, with their chats', async () => {
    const tables: Record<string, Row[]> = {
      events: [
        { id: 'ended-empty', end_date_time: ENDED },
        { id: 'ended-matched', end_date_time: ENDED },
        { id: 'ended-archived', end_date_time: ENDED },
        { id: 'upcoming', end_date_time: LATER },
      ],
      matches: [
        { id: 'm1', event_id: 'ended-matched', archived_at: null },
        { id: 'm2', event_id: 'ended-archived', archived_at: ENDED },
      ],
      chats: [
        { id: 'c1', event_id: 'ended-matched' },
        // A chat whose match is gone still goes with its event.
        { id: 'c2', event_id: 'ended-empty' },
      ],
      chat_messages: [
        { id: 'cm1', chat_id: 'c1' },
        { id: 'cm2', chat_id: 'c2' },
      ],
    };
    const service = new CleanupService(fakeDatabase(tables), fakeBucket([]).r2);

    await expect(service.deleteOldEvents(CUTOFF)).resolves.toBe(1);

    expect(tables.events.map((e) => e.id)).toEqual([
      'ended-matched',
      'ended-archived',
      'upcoming',
    ]);
    expect(tables.matches.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(tables.chats.map((c) => c.id)).toEqual(['c1']);
    expect(tables.chat_messages.map((m) => m.id)).toEqual(['cm1']);
  });

  it('deletes nothing when every past event has a match', async () => {
    const tables: Record<string, Row[]> = {
      events: [{ id: 'ended-matched', end_date_time: ENDED }],
      matches: [{ id: 'm1', event_id: 'ended-matched', archived_at: null }],
      chats: [],
      chat_messages: [],
    };
    const service = new CleanupService(fakeDatabase(tables), fakeBucket([]).r2);

    await expect(service.deleteOldEvents(CUTOFF)).resolves.toBe(0);
    expect(tables.events).toHaveLength(1);
    expect(tables.matches).toHaveLength(1);
  });

  it('checks every past event, beyond one batch of match lookups', async () => {
    const events = Array.from({ length: 45 }, (_, i) => ({
      id: `e${i}`,
      end_date_time: ENDED,
    }));
    const tables: Record<string, Row[]> = {
      events,
      // One event in the last batch has a match.
      matches: [{ id: 'm1', event_id: 'e44', archived_at: null }],
      chats: [],
      chat_messages: [],
    };
    const service = new CleanupService(fakeDatabase(tables), fakeBucket([]).r2);

    await expect(service.deleteOldEvents(CUTOFF)).resolves.toBe(44);
    expect(tables.events.map((e) => e.id)).toEqual(['e44']);
  });

  it("deletes the deleted events' pictures from R2, keeping those still in use", async () => {
    const tables: Record<string, Row[]> = {
      events: [
        {
          id: 'own-picture',
          end_date_time: ENDED,
          picture_url: `${R2}/event-images/scraped/own-picture/picture.webp`,
        },
        {
          id: 'shares-with-kept-event',
          end_date_time: ENDED,
          picture_url: `${R2}/event-images/host/poster.webp`,
        },
        {
          id: 'kept-with-match',
          end_date_time: ENDED,
          picture_url: `${R2}/event-images/host/poster.webp`,
        },
        {
          id: 'shares-with-venue',
          end_date_time: ENDED,
          picture_url: `${R2}/venue-images/scraped/v1/picture.webp`,
        },
        {
          id: 'external-picture',
          end_date_time: ENDED,
          picture_url: 'https://assets.tickets.rs/poster.jpg',
        },
        { id: 'no-picture', end_date_time: ENDED, picture_url: null },
      ],
      venues: [
        {
          id: 'v1',
          picture_url: `${R2}/venue-images/scraped/v1/picture.webp`,
        },
      ],
      matches: [{ id: 'm1', event_id: 'kept-with-match', archived_at: null }],
      chats: [],
      chat_messages: [],
    };
    const bucket = fakeBucket([
      'event-images/scraped/own-picture/picture.webp',
      'event-images/host/poster.webp',
      'venue-images/scraped/v1/picture.webp',
    ]);
    const service = new CleanupService(fakeDatabase(tables), bucket.r2);

    await expect(service.deleteOldEvents(CUTOFF)).resolves.toBe(5);

    expect(tables.events.map((e) => e.id)).toEqual(['kept-with-match']);
    expect(bucket.deleteObject.mock.calls.map(([key]) => key)).toEqual([
      'event-images/scraped/own-picture/picture.webp',
    ]);
    expect([...bucket.objects]).toEqual([
      'event-images/host/poster.webp',
      'venue-images/scraped/v1/picture.webp',
    ]);
  });

  it('still deletes the events when R2 fails to delete a picture', async () => {
    const tables: Record<string, Row[]> = {
      events: [
        {
          id: 'e1',
          end_date_time: ENDED,
          picture_url: `${R2}/event-images/scraped/e1/picture.webp`,
        },
        {
          id: 'e2',
          end_date_time: ENDED,
          picture_url: `${R2}/event-images/scraped/e2/picture.webp`,
        },
      ],
      matches: [],
      chats: [],
      chat_messages: [],
    };
    const bucket = fakeBucket(
      [
        'event-images/scraped/e1/picture.webp',
        'event-images/scraped/e2/picture.webp',
      ],
      ['event-images/scraped/e1/picture.webp'],
    );
    const service = new CleanupService(fakeDatabase(tables), bucket.r2);

    await expect(service.deleteOldEvents(CUTOFF)).resolves.toBe(2);

    expect(tables.events).toHaveLength(0);
    expect([...bucket.objects]).toEqual([
      'event-images/scraped/e1/picture.webp',
    ]);
  });
});
