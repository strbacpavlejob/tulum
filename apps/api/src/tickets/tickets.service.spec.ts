import { ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseService } from '../supabase/supabase.service';
import { TicketsService } from './tickets.service';

type ScriptedResult = { data: unknown; error: unknown };
type ScriptMap = Record<string, ScriptedResult[]>;

const GUEST_ID = 'guest-user';
const EVENT_ID = '7d0f6c2a-3b4e-4f51-9a6b-2c8d1e0f3a45';

function createServiceWithScript(script: ScriptMap) {
  const consume = (key: string): Promise<ScriptedResult> => {
    const next = script[key]?.shift();
    return Promise.resolve(next ?? { data: null, error: null });
  };

  const queries: Array<{ table: string; query: Record<string, jest.Mock> }> =
    [];

  const db = {
    from: jest.fn((table: string) => {
      const query: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(async () => consume(`${table}.maybeSingle`)),
        single: jest.fn(async () => consume(`${table}.single`)),
        // Awaiting the builder itself resolves a list query.
        then: jest.fn(
          (
            resolve: (value: ScriptedResult) => unknown,
            reject: (reason: unknown) => unknown,
          ) => consume(`${table}.list`).then(resolve, reject),
        ),
      };
      queries.push({ table, query });
      return query;
    }),
  };

  const supabaseService = {
    getClient: () => db,
  } as unknown as SupabaseService;

  return {
    service: new TicketsService(supabaseService),
    callsTo: (table: string, method: string) =>
      queries
        .filter((q) => q.table === table)
        .flatMap((q) => q.query[method].mock.calls),
  };
}

const targetEvent = {
  id: EVENT_ID,
  title: 'Target night',
  start_date_time: '2026-10-24T20:00:00',
  end_date_time: '2026-10-25T02:00:00',
};

describe('TicketsService attendEvent', () => {
  it('returns the existing ticket without inserting another', async () => {
    const ticket = { id: 'ticket-1', guest_id: GUEST_ID, event_id: EVENT_ID };
    const { service, callsTo } = createServiceWithScript({
      'tickets.maybeSingle': [{ data: ticket, error: null }],
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).resolves.toEqual({
      ticket,
      isNew: false,
    });
    expect(callsTo('tickets', 'insert')).toHaveLength(0);
  });

  it('creates a ticket when the guest has none and nothing overlaps', async () => {
    const ticket = { id: 'ticket-1', guest_id: GUEST_ID, event_id: EVENT_ID };
    const { service, callsTo } = createServiceWithScript({
      'tickets.maybeSingle': [{ data: null, error: null }],
      'events.single': [{ data: targetEvent, error: null }],
      'tickets.list': [{ data: [], error: null }],
      'tickets.single': [{ data: ticket, error: null }],
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).resolves.toEqual({
      ticket,
      isNew: true,
    });
    expect(callsTo('tickets', 'insert')).toEqual([
      [{ guest_id: GUEST_ID, event_id: EVENT_ID }],
    ]);
  });

  it('returns the concurrently created ticket when the insert hits the unique constraint', async () => {
    const concurrentTicket = {
      id: 'ticket-from-parallel-request',
      guest_id: GUEST_ID,
      event_id: EVENT_ID,
    };
    const { service, callsTo } = createServiceWithScript({
      'tickets.maybeSingle': [
        { data: null, error: null },
        { data: concurrentTicket, error: null },
      ],
      'events.single': [{ data: targetEvent, error: null }],
      'tickets.list': [{ data: [], error: null }],
      'tickets.single': [{ data: null, error: { code: '23505' } }],
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).resolves.toEqual({
      ticket: concurrentTicket,
      isNew: false,
    });
    // A same-event ticket from a parallel RSVP must not count as an overlap.
    expect(callsTo('tickets', 'neq')).toEqual([['event_id', EVENT_ID]]);
  });

  it('rejects an RSVP that overlaps another attended event', async () => {
    const { service, callsTo } = createServiceWithScript({
      'tickets.maybeSingle': [{ data: null, error: null }],
      'events.single': [{ data: targetEvent, error: null }],
      'tickets.list': [
        {
          data: [
            {
              event_id: 'other-event',
              events: {
                title: 'Other night',
                start_date_time: '2026-10-24T22:00:00',
                end_date_time: '2026-10-25T01:00:00',
              },
            },
          ],
          error: null,
        },
      ],
    });

    await expect(
      service.attendEvent(GUEST_ID, EVENT_ID),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(callsTo('tickets', 'insert')).toHaveLength(0);
  });

  it('rethrows insert errors other than a unique violation', async () => {
    const insertError = { code: '23503', message: 'foreign key violation' };
    const { service } = createServiceWithScript({
      'tickets.maybeSingle': [{ data: null, error: null }],
      'events.single': [{ data: targetEvent, error: null }],
      'tickets.list': [{ data: [], error: null }],
      'tickets.single': [{ data: null, error: insertError }],
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).rejects.toBe(
      insertError,
    );
  });

  it('fails instead of inserting when the existing-ticket lookup errors', async () => {
    const lookupError = { code: 'PGRST000', message: 'lookup failed' };
    const { service, callsTo } = createServiceWithScript({
      'tickets.maybeSingle': [{ data: null, error: lookupError }],
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).rejects.toBe(
      lookupError,
    );
    expect(callsTo('tickets', 'insert')).toHaveLength(0);
  });
});
