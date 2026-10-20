import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseService } from '../supabase/supabase.service';
import { StatisticsService } from './statistics.service';

type Result = { data: unknown; error: unknown };

// Queries here are awaited without .single(), so each table's builder is a
// thenable that resolves to its scripted result.
function createService(results: Record<string, Result>) {
  const from = jest.fn((table: string) => {
    const result = results[table] ?? { data: [], error: null };
    const query = {
      select: () => query,
      eq: () => query,
      in: () => query,
      then: (
        resolve: (value: Result) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  });
  const supabaseService = {
    getClient: () => ({ from }),
  } as unknown as SupabaseService;
  return { service: new StatisticsService(supabaseService), from };
}

const HOST = 'user_host';

describe('StatisticsService venue ownership', () => {
  it("refuses another host's venue_id", async () => {
    const { service, from } = createService({
      venues: { data: [{ id: 'own-venue' }], error: null },
    });

    await expect(
      service.getStatistics(HOST, 'someone-elses-venue'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(from).not.toHaveBeenCalledWith('events');
  });

  it("accepts the host's own venue_id", async () => {
    const { service, from } = createService({
      venues: { data: [{ id: 'own-venue' }], error: null },
      events: { data: [], error: null },
    });

    await expect(service.getStatistics(HOST, 'own-venue')).resolves.toEqual(
      expect.objectContaining({
        eventStatistics: {
          seenCount: 0,
          savedCount: 0,
          ticketCount: 0,
          visitedCount: 0,
        },
      }),
    );
    expect(from).toHaveBeenCalledWith('events');
  });
});
