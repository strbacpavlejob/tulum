import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CleanupService } from './cleanup.service';

type Result = { data: unknown; error: unknown };

interface Query extends PromiseLike<Result> {
  select(): Query;
  lt(): Query;
}

// events.end_date_time holds UTC without an offset, as supabase-js returns
// it. Run with TZ=Europe/Belgrade and TZ=America/New_York to catch a value
// read as local time.
const utcWallTime = (minutesFromNow: number) =>
  new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString().slice(0, 19);

function createService(matches: unknown[]) {
  const query: Query = {
    select: () => query,
    lt: () => query,
    then: (onfulfilled, onrejected) =>
      Promise.resolve({ data: matches, error: null }).then(
        onfulfilled,
        onrejected,
      ),
  };
  const supabaseService = {
    getClient: () => ({ from: () => query }),
  } as unknown as SupabaseService;
  return new CleanupService(supabaseService, {} as R2Service);
}

describe('CleanupService previewExpiredMatches', () => {
  it('reads event end times as UTC', async () => {
    const endedAt = utcWallTime(-30);
    const service = createService([
      {
        id: 1,
        event_id: 10,
        matched_at: '2026-10-20T18:00:00+00:00',
        event: { id: 10, title: 'Ended', end_date_time: endedAt },
      },
      {
        id: 2,
        event_id: 20,
        matched_at: '2026-10-20T18:00:00+00:00',
        event: { id: 20, title: 'Still on', end_date_time: utcWallTime(30) },
      },
    ]);

    await expect(service.previewExpiredMatches()).resolves.toEqual({
      total_matches: 1,
      events: [
        {
          event_id: 10,
          event_title: 'Ended',
          end_date_time: `${endedAt}.000Z`,
          match_ids: [1],
        },
      ],
    });
  });
});

describe('CleanupService archives instead of deleting', () => {
  const EVENT = '7d0f6c2a-3b4e-4f51-9a6b-2c8d1e0f3a45';

  // matches.update(...).in(...).is(...).select('id') answers result.
  function archiveService(result: { data: unknown; error: unknown }) {
    const calls: Record<string, unknown[]> = {};
    const record =
      (name: string, value: unknown) =>
      (...args: unknown[]) => {
        calls[name] = args;
        return value;
      };
    const archive: Record<string, unknown> = {};
    Object.assign(archive, {
      in: record('in', archive),
      is: record('is', archive),
      select: record('select', Promise.resolve(result)),
    });
    const matches = {
      update: record('update', archive),
      delete: jest.fn(),
    };
    const events = {
      select: () => ({
        lt: () => Promise.resolve({ data: [{ id: EVENT }], error: null }),
      }),
    };
    const from = (table: string) => (table === 'events' ? events : matches);
    const service = new CleanupService(
      { getClient: () => ({ from }) } as unknown as SupabaseService,
      {} as R2Service,
    );
    return { service, calls, matches };
  }

  it('archives the matches of past events and deletes nothing', async () => {
    const { service, calls, matches } = archiveService({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
    });

    await expect(service.cleanupExpiredMatches()).resolves.toEqual({
      archived_matches: 2,
      events_affected: [EVENT],
    });
    expect(matches.delete).not.toHaveBeenCalled();
    expect(calls.update[0]).toEqual({ archived_at: expect.any(String) });
    expect(calls.in).toEqual(['event_id', [EVENT]]);
    // Matches archived earlier keep their first archived_at.
    expect(calls.is).toEqual(['archived_at', null]);
  });

  it('archives one event’s matches', async () => {
    const { service, matches } = archiveService({
      data: [{ id: 5 }],
      error: null,
    });

    await expect(service.cleanupMatchesForEvent(EVENT)).resolves.toEqual({
      event_id: EVENT,
      archived_matches: 1,
    });
    expect(matches.delete).not.toHaveBeenCalled();
  });

  it('refuses, rather than deleting, until archived_at exists', async () => {
    const { service, matches } = archiveService({
      data: null,
      error: {
        code: 'PGRST204',
        message: "Could not find the 'archived_at' column",
      },
    });

    await expect(service.cleanupMatchesForEvent(EVENT)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(matches.delete).not.toHaveBeenCalled();
  });
});
