/**
 * Checks for BUG-030: checking in twice must not leave two active event
 * sessions, and a user who already has two must still be able to swipe and
 * see the deck. EventsController, MatchesService and GuestsService run
 * against in-memory tables. Like PostgREST, maybeSingle() errors when more
 * than one row matches, and the unique index from
 * supabase/migrations/20261024134453_one_active_event_session.sql can be
 * switched on or off.
 */
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { GuestsService } from '../guests/guests.service';
import { MatchesService } from '../matches/matches.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
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
  // A like the limit allows; no reciprocal like, so no match.
  rpc: () =>
    Promise.resolve({
      data: {
        allowed: true,
        was_already_liked: false,
        likes_used: 1,
        like_limit: 3,
        eligible_guest_count: 1,
        limit_reached: false,
      },
      error: null,
    }),
};
const supabaseService = { getClient: () => db } as unknown as SupabaseService;

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

describe('Checking in (POST /events/sessions, BUG-030)', () => {
  const controller = new EventsController(supabaseService);
  const checkIn = () => controller.createSession(ME, { event_id: EVENT });

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

describe('Swiping with duplicate sessions (BUG-030)', () => {
  const service = new MatchesService(supabaseService);
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
  const service = new GuestsService(supabaseService, {} as R2Service);

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
