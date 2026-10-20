import { ConflictException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseService } from '../supabase/supabase.service';
import { TicketsService } from './tickets.service';

type RpcResult = { data: unknown; error: unknown };

const GUEST_ID = 'guest-user';
const EVENT_ID = '7d0f6c2a-3b4e-4f51-9a6b-2c8d1e0f3a45';
const ATTEND_EVENT_FUNCTION = 'attend_event_with_overlap_check';

function createServiceWithRpcResult(result: RpcResult) {
  const single = jest.fn(() => Promise.resolve(result));
  const db = {
    rpc: jest.fn(() => ({ single })),
    from: jest.fn(),
  };

  const supabaseService = {
    getClient: () => db,
  } as unknown as SupabaseService;

  return { service: new TicketsService(supabaseService), db, single };
}

const ticket = {
  id: 'ticket-1',
  event_id: EVENT_ID,
  guest_id: GUEST_ID,
  created_at: '2026-10-19T18:31:58.085686+00:00',
  updated_at: '2026-10-19T18:31:58.085686+00:00',
};

describe('TicketsService attendEvent', () => {
  it('creates the ticket with one call to the database function', async () => {
    const { service, db, single } = createServiceWithRpcResult({
      data: { ticket, is_new: true, conflicting_event_title: null },
      error: null,
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).resolves.toEqual({
      ticket,
      isNew: true,
    });
    expect(db.rpc.mock.calls).toEqual([
      [ATTEND_EVENT_FUNCTION, { p_guest_id: GUEST_ID, p_event_id: EVENT_ID }],
    ]);
    expect(single).toHaveBeenCalledTimes(1);
    // The overlap check and the insert must not run as separate requests:
    // concurrent RSVPs to two overlapping events could both pass the check.
    expect(db.from).not.toHaveBeenCalled();
  });

  it('returns the existing ticket when the guest already attends', async () => {
    const { service, db } = createServiceWithRpcResult({
      data: { ticket, is_new: false, conflicting_event_title: null },
      error: null,
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).resolves.toEqual({
      ticket,
      isNew: false,
    });
    expect(db.from).not.toHaveBeenCalled();
  });

  it('rejects an RSVP that overlaps another attended event', async () => {
    const { service } = createServiceWithRpcResult({
      data: {
        ticket: null,
        is_new: false,
        conflicting_event_title: 'Other night',
      },
      error: null,
    });

    const attempt = service.attendEvent(GUEST_ID, EVENT_ID);
    await expect(attempt).rejects.toBeInstanceOf(ConflictException);
    await expect(attempt).rejects.toThrow(
      'This event overlaps with "Other night" that you are already attending',
    );
  });

  it('rethrows errors from the database function', async () => {
    const rpcError = {
      code: 'P0002',
      message: `Event ${EVENT_ID} not found`,
    };
    const { service } = createServiceWithRpcResult({
      data: null,
      error: rpcError,
    });

    await expect(service.attendEvent(GUEST_ID, EVENT_ID)).rejects.toBe(
      rpcError,
    );
  });
});

describe('TicketsService getTickets', () => {
  it('sends event times as UTC instants (BUG-009)', async () => {
    // supabase-js returns the event's timestamp without time zone columns,
    // which hold UTC, with no offset. 19:00 UTC is 20:00 in Belgrade.
    const row = {
      id: 'ticket-1',
      event_id: EVENT_ID,
      guest_id: GUEST_ID,
      created_at: ticket.created_at,
      events: {
        title: 'Pat Todd & The Rankoutsiders',
        start_date_time: '2026-10-29T19:00:00',
        end_date_time: '2026-10-30T00:00:00',
        tags: [],
        venues: { name: 'Zappa Baza', latitude: 44.8, longitude: 20.45 },
      },
    };
    interface Query extends PromiseLike<RpcResult> {
      eq(): Query;
    }
    const query: Query = {
      eq: () => query,
      then: (onfulfilled, onrejected) =>
        Promise.resolve({ data: [row], error: null }).then(
          onfulfilled,
          onrejected,
        ),
    };
    const db = { from: jest.fn(() => ({ select: () => query })) };
    const service = new TicketsService({
      getClient: () => db,
    } as unknown as SupabaseService);

    await expect(service.getTickets(GUEST_ID)).resolves.toEqual([
      expect.objectContaining({
        event_id: EVENT_ID,
        date: '2026-10-29T19:00:00.000Z',
        end_date_time: '2026-10-30T00:00:00.000Z',
      }),
    ]);
  });
});
