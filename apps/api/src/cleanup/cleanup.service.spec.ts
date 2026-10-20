import { describe, expect, it } from '@jest/globals';
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
  return new CleanupService(supabaseService);
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
