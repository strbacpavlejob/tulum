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
