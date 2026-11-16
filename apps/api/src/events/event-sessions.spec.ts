/**
 * Checks for BUG-030: checking in twice must not leave two active event
 * sessions, and a user who already has two must still be able to swipe and
 * see the deck. EventsController, MatchesService and GuestsService run
 * against in-memory tables. Like PostgREST, maybeSingle() errors when more
 * than one row matches, and the unique index from
 * supabase/migrations/20261024134453_one_active_event_session.sql can be
 * switched on or off. Also N-6: a check-in needs a ticket, the event on and
 * a position near the venue.
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { InboxPushService } from '../chats/inbox-push.service';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { GuestsService } from '../guests/guests.service';
import { MatchesService } from '../matches/matches.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { EventsController } from './events.controller';

const EVENT = 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101';
const ME = 'user_me';
const OTHER = 'user_other';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };

let tables: Record<string, Row[]>;
let uniqueActiveIndex: boolean;
// Runs once just before the next event_sessions insert: a parallel check-in.
let beforeSessionInsert: (() => void) | null;
let nextId: number;

const session = (userId: string, enteredAt: string, exitedAt?: string) => ({
  id: nextId++,
  user_id: userId,
  event_id: EVENT,
  entered_at: enteredAt,
  exited_at: exitedAt ?? null,
  ticket_id: null,
});

const activeSessions = (userId: string) =>
  tables.event_sessions.filter(
    (s) => s.user_id === userId && s.exited_at === null,
  );

// Just enough of the supabase-js query builder for the three code paths.
function from(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  const orders: { column: string; ascending: boolean }[] = [];
  let limit: number | null = null;
  let insert: Row | null = null;

  const insertSession = (): { rows: Row[]; error: unknown } => {
    const values = insert!;
    beforeSessionInsert?.();
    beforeSessionInsert = null;
    const clash = tables.event_sessions.some(
      (s) =>
        s.user_id === values.user_id &&
        s.event_id === values.event_id &&
        s.exited_at === null,
    );
    if (uniqueActiveIndex && clash) {
      return { rows: [], error: { code: '23505' } };
    }
    const row = {
      ...session(String(values.user_id), new Date().toISOString()),
      ticket_id: values.ticket_id ?? null,
    };
    tables.event_sessions.push(row);
    return { rows: [{ ...row }], error: null };
  };

  const run = (): { rows: Row[]; error: unknown } => {
    if (insert) return insertSession();
    let rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
    rows = [...rows].sort((a, b) => {
      for (const { column, ascending } of orders) {
        const x = String(a[column]);
        const y = String(b[column]);
        if (x !== y) return (x < y ? -1 : 1) * (ascending ? 1 : -1);
      }
      return 0;
    });
    if (limit !== null) rows = rows.slice(0, limit);
    return { rows: rows.map((r) => ({ ...r })), error: null };
  };

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push((row) => row[column] === value);
      return query;
    },
    neq: (column: string, value: unknown) => {
      filters.push((row) => row[column] !== value);
      return query;
    },
    is: (column: string, value: unknown) => {
      filters.push((row) => (row[column] ?? null) === value);
      return query;
    },
    in: (column: string, values: unknown[]) => {
      filters.push((row) => values.includes(row[column]));
      return query;
    },
    // Only the matches lookup uses or(), and that table is empty here.
    or: () => query,
    order: (column: string, options?: { ascending?: boolean }) => {
      orders.push({ column, ascending: options?.ascending ?? true });
      return query;
    },
    limit: (count: number) => {
      limit = count;
      return query;
    },
    insert: (values: Row) => {
      insert = values;
      return query;
    },
    maybeSingle: (): Promise<Result> => {
      const { rows, error } = run();
      if (error) return Promise.resolve({ data: null, error });
      if (rows.length > 1) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    single: (): Promise<Result> => {
      const { rows, error } = run();
      if (error) return Promise.resolve({ data: null, error });
      return Promise.resolve(
        rows.length === 1
          ? { data: rows[0], error: null }
          : { data: null, error: { code: 'PGRST116' } },
      );
    },
    // Awaiting the query itself returns every matching row.
    then: (resolve: (value: Result) => unknown) => {
      const { rows, error } = run();
      return Promise.resolve(resolve({ data: error ? null : rows, error }));
    },
  };
  return query;
}

const db = {
  from,
  // A like the limit allows; no reciprocal like, so no match. PostgREST
  // doesn't know the other functions, as before the paging migration, so the
  // deck reads the tables above.
  rpc: (fn: string) =>
    Promise.resolve(
      fn === 'submit_guest_swipe_with_limit'
        ? {
            data: {
              allowed: true,
              was_already_liked: false,
              likes_used: 1,
              like_limit: 3,
              eligible_guest_count: 1,
              limit_reached: false,
            },
            error: null,
          }
        : {
            data: null,
            error: {
              code: 'PGRST202',
              message: `Could not find the function public.${fn}`,
            },
          },
    ),
};
const supabaseService = { getClient: () => db } as unknown as SupabaseService;
const guestSafety = new GuestSafetyService(supabaseService);

beforeEach(() => {
  uniqueActiveIndex = true;
  beforeSessionInsert = null;
  nextId = 1;
  tables = {
    event_sessions: [],
    tickets: [],
    guest_swipes: [],
    matches: [],
    guests: [
      {
        user_id: OTHER,
        gender: 'female',
        picture_urls: [],
        birthday: '1998-03-02',
        interests: ['Music'],
        bio: null,
        users: { first_name: 'Ana', last_name: null, avatar_url: null },
      },
    ],
    events: [{ id: EVENT, title: 'QA Night', venues: { name: 'QA Bar' } }],
  };
});

const VENUE = { latitude: 44.8176, longitude: 20.4569 };
const MINUTE = 60_000;
// As supabase-js returns the events' times: UTC without an offset.
const dbTime = (ms: number) => new Date(ms).toISOString().slice(0, 19);
// A latitude this many metres north of the venue.
const north = (metres: number) => VENUE.latitude + metres / 111_194.93;

// My ticket, for an event that started an hour ago and ends in three.
const myTicket = (
  times = { start: Date.now() - 60 * MINUTE, end: Date.now() + 180 * MINUTE },
  venue: Row | null = VENUE,
) => ({
  id: 'ticket_me',
  guest_id: ME,
  event_id: EVENT,
  events: {
    start_date_time: dbTime(times.start),
    end_date_time: dbTime(times.end),
    venues: venue,
  },
});

describe('Checking in (POST /events/sessions, BUG-030)', () => {
  const controller = new EventsController(supabaseService);
  const checkIn = () =>
    controller.createSession(ME, { event_id: EVENT, ...VENUE, accuracy: 20 });

  beforeEach(() => {
    tables.tickets.push(myTicket());
  });

  it('returns the open session instead of adding another', async () => {
    const first = await checkIn();
    const again = await checkIn();
    expect(again.session).toStrictEqual(first.session);
    expect(activeSessions(ME)).toHaveLength(1);
  });

  it('adds a session when the earlier one was closed', async () => {
    tables.event_sessions.push(
      session(ME, '2026-10-24T18:00:00Z', '2026-10-24T19:00:00Z'),
    );
    const { session: opened } = await checkIn();
    expect(opened).toMatchObject({ user_id: ME, exited_at: null });
    expect(tables.event_sessions).toHaveLength(2);
    expect(activeSessions(ME)).toHaveLength(1);
  });

  it('returns the other session when a parallel check-in gets in first', async () => {
    let winner: Row | null = null;
    beforeSessionInsert = () => {
      winner = session(ME, '2026-10-24T20:00:00Z');
      tables.event_sessions.push(winner);
    };
    const { session: returned } = await checkIn();
    expect(returned).toStrictEqual(winner);
    expect(activeSessions(ME)).toHaveLength(1);
  });

  // Without the migration's unique index, such a race still leaves two rows;
  // the lookups below keep that from blocking anyone.
  it('can still add a second row in that race before the migration', async () => {
    uniqueActiveIndex = false;
    beforeSessionInsert = () => {
      tables.event_sessions.push(session(ME, '2026-10-24T20:00:00Z'));
    };
    await checkIn();
    expect(activeSessions(ME)).toHaveLength(2);
  });
});

describe('Checking in needs a ticket, the event on and the venue near (N-6)', () => {
  const controller = new EventsController(supabaseService);
  const checkIn = (position: { latitude?: number; accuracy?: number } = {}) =>
    controller.createSession(ME, {
      event_id: EVENT,
      latitude: position.latitude ?? VENUE.latitude,
      longitude: VENUE.longitude,
      accuracy: position.accuracy ?? 20,
    });
  // The refusal's reason, or null when the check-in went through.
  const reasonOf = async (attempt: Promise<unknown>) => {
    try {
      await attempt;
      return null;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) throw error;
      return (error.getResponse() as { reason: string }).reason;
    }
  };
  const radius = process.env.CHECKIN_RADIUS_METERS;

  beforeEach(() => {
    delete process.env.CHECKIN_RADIUS_METERS;
  });
  afterEach(() => {
    if (radius === undefined) delete process.env.CHECKIN_RADIUS_METERS;
    else process.env.CHECKIN_RADIUS_METERS = radius;
  });

  it('checks in a guest at the venue and records the ticket', async () => {
    tables.tickets.push(myTicket());
    const { session: opened } = await checkIn();
    expect(opened).toMatchObject({ user_id: ME, ticket_id: 'ticket_me' });
  });

  it('refuses a guest without a ticket', async () => {
    expect(await reasonOf(checkIn())).toBe('no_ticket');
    expect(tables.event_sessions).toHaveLength(0);
  });

  it('refuses before the event and after it, and opens 5 minutes early', async () => {
    const now = Date.now();
    tables.tickets = [
      myTicket({ start: now + 6 * MINUTE, end: now + 240 * MINUTE }),
    ];
    expect(await reasonOf(checkIn())).toBe('not_live');
    tables.tickets = [
      myTicket({ start: now - 240 * MINUTE, end: now - MINUTE }),
    ];
    expect(await reasonOf(checkIn())).toBe('not_live');
    tables.tickets = [
      myTicket({ start: now + 4 * MINUTE, end: now + 240 * MINUTE }),
    ];
    expect(await reasonOf(checkIn())).toBeNull();
  });

  it('allows for the reported accuracy, up to the radius', async () => {
    tables.tickets.push(myTicket());
    // The radius is 300 m. 450 m away needs at least 150 m of accuracy, and
    // the allowance never passes the radius, so 650 m away is always too far.
    expect(
      await reasonOf(checkIn({ latitude: north(450), accuracy: 100 })),
    ).toBe('too_far');
    expect(
      await reasonOf(checkIn({ latitude: north(650), accuracy: 5000 })),
    ).toBe('too_far');
    expect(tables.event_sessions).toHaveLength(0);
    expect(
      await reasonOf(checkIn({ latitude: north(450), accuracy: 200 })),
    ).toBeNull();
  });

  it('uses CHECKIN_RADIUS_METERS', async () => {
    tables.tickets.push(myTicket());
    process.env.CHECKIN_RADIUS_METERS = '1000';
    expect(
      await reasonOf(checkIn({ latitude: north(900), accuracy: 0 })),
    ).toBeNull();
  });

  it('refuses at a venue that was never located', async () => {
    tables.tickets = [myTicket(undefined, { latitude: 0, longitude: 0 })];
    expect(await reasonOf(checkIn())).toBe('no_venue_location');
    tables.tickets = [myTicket(undefined, { latitude: null, longitude: null })];
    expect(await reasonOf(checkIn())).toBe('no_venue_location');
  });

  it('returns an open check-in as it is, checked when it opened', async () => {
    tables.event_sessions.push(session(ME, '2026-10-24T20:00:00Z'));
    const { session: open } = await checkIn({ latitude: north(5000) });
    expect(open).toMatchObject({ user_id: ME, exited_at: null });
  });
});

describe('Swiping with duplicate sessions (BUG-030)', () => {
  const service = new MatchesService(
    supabaseService,
    guestSafety,
    new InboxPushService(),
  );
  const like = () =>
    service.submitSwipeDecision(ME, {
      other_user_id: OTHER,
      event_id: EVENT,
      liked: true,
    });

  it('accepts a like when both guests have two active sessions', async () => {
    tables.event_sessions.push(
      session(ME, '2026-10-24T20:00:00Z'),
      session(ME, '2026-10-24T20:05:00Z'),
      session(OTHER, '2026-10-24T20:01:00Z'),
      session(OTHER, '2026-10-24T20:06:00Z'),
    );
    await expect(like()).resolves.toMatchObject({
      matched: false,
      likes_used: 1,
    });
  });

  it('still refuses a guest who left the event and has no ticket', async () => {
    tables.event_sessions.push(
      session(ME, '2026-10-24T20:00:00Z'),
      session(OTHER, '2026-10-24T20:01:00Z', '2026-10-24T21:00:00Z'),
    );
    const error = await like().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).message).toBe(
      'Both users must be at the same live event',
    );
  });

  it('accepts a guest who left the event but has a ticket', async () => {
    tables.event_sessions.push(
      session(ME, '2026-10-24T20:00:00Z'),
      session(OTHER, '2026-10-24T20:01:00Z', '2026-10-24T21:00:00Z'),
    );
    tables.tickets.push({ id: 't1', event_id: EVENT, guest_id: OTHER });
    await expect(like()).resolves.toMatchObject({ matched: false });
  });
});

describe('The deck with duplicate sessions (BUG-030)', () => {
  const service = new GuestsService(
    supabaseService,
    {} as R2Service,
    guestSafety,
    {
      ensureUserRow: () => Promise.resolve(),
    } as unknown as UserProvisioningService,
  );

  it('shows the deck to a guest with two active sessions and no ticket', async () => {
    tables.event_sessions.push(
      session(ME, '2026-10-24T20:00:00Z'),
      session(ME, '2026-10-24T20:05:00Z'),
      session(OTHER, '2026-10-24T20:01:00Z'),
    );
    const deck = await service.getSwipeableGuests(ME, EVENT);
    expect(deck.event_id).toBe(EVENT);
    expect(deck.profiles.map((p: { user_id: string }) => p.user_id)).toEqual([
      OTHER,
    ]);
  });
});
