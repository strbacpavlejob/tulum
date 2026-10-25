/**
 * TASK-001: blocks and visibility are enforced by the API. The real
 * GuestsService (Matches deck), TicketsService (event guest list),
 * MatchesService (inbox and swipes) and ChatsService run with the real
 * GuestSafetyService over in-memory tables.
 *
 * At one live event, everyone has a ticket and an active session:
 * - ME, whose view is checked;
 * - ANA (everyone sees her);
 * - BOJAN, whom ME blocked;
 * - CEDA, who blocked ME;
 * - DUNJA, who shows herself only to people she liked, and liked ME;
 * - EMA, who shows herself only to people she liked, and liked only ANA;
 * - FILIP, who is hidden.
 * The inbox tests add ME's matches with ANA, BOJAN and CEDA; matched guests
 * are never in the deck.
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { ChatsService } from '../chats/chats.service';
import { GuestsService } from '../guests/guests.service';
import { MatchesService } from '../matches/matches.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TicketsService } from '../tickets/tickets.service';
import { GuestSafetyService } from './guest-safety.service';

const EVENT = 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101';
const ME = 'user_me';
const ANA = 'user_ana';
const BOJAN = 'user_bojan';
const CEDA = 'user_ceda';
const DUNJA = 'user_dunja';
const EMA = 'user_ema';
const FILIP = 'user_filip';
// Signed in, but not going to the event.
const OUTSIDER = 'user_outsider';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };

let tables: Record<string, Row[]>;
let nextMatchId: number;

const hoursFromNow = (hours: number) =>
  // events times are timestamp without time zone holding UTC: no offset.
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString().slice(0, 19);

const people: [string, string, 'female' | 'male', string | undefined][] = [
  [ME, 'Mila', 'female', 'everyone'],
  [ANA, 'Ana', 'female', 'everyone'],
  [BOJAN, 'Bojan', 'male', 'everyone'],
  [CEDA, 'Ceda', 'male', 'everyone'],
  [DUNJA, 'Dunja', 'female', 'liked'],
  [EMA, 'Ema', 'female', 'liked'],
  [FILIP, 'Filip', 'male', 'hidden'],
];

function seedTables(): Record<string, Row[]> {
  return {
    users: [...people, [OUTSIDER, 'Ognjen', 'male', 'everyone'] as const].map(
      ([id, name]) => ({
        id,
        first_name: name,
        last_name: null,
        avatar_url: `https://cdn.example.com/${id}.webp`,
      }),
    ),
    guests: [...people, [OUTSIDER, 'Ognjen', 'male', 'everyone'] as const].map(
      ([id, , gender, visibility], n) => ({
        user_id: id,
        gender,
        birthday: `${1990 + n}-05-05T00:00:00+00:00`,
        picture_urls: [`https://cdn.example.com/${id}-1.webp`],
        interests: ['Music'],
        bio: null,
        visibility,
      }),
    ),
    events: [
      {
        id: EVENT,
        title: 'Jazz night',
        start_date_time: hoursFromNow(-1),
        end_date_time: hoursFromNow(3),
        venues: { name: 'Bar', capacity: 100, latitude: 44.8, longitude: 20.4 },
      },
    ],
    tickets: people.map(([id], n) => ({
      id: `ticket-${n}`,
      event_id: EVENT,
      guest_id: id,
    })),
    event_sessions: people.map(([id], n) => ({
      id: n + 1,
      event_id: EVENT,
      user_id: id,
      exited_at: null,
      entered_at: hoursFromNow(-1),
    })),
    guest_blocks: [
      { blocker_id: ME, blocked_id: BOJAN },
      { blocker_id: CEDA, blocked_id: ME },
    ],
    guest_swipes: [
      {
        swiper_user_id: DUNJA,
        swiped_user_id: ME,
        event_id: EVENT,
        liked: true,
      },
      {
        swiper_user_id: EMA,
        swiped_user_id: ANA,
        event_id: EVENT,
        liked: true,
      },
    ],
    matches: [],
    chats: [],
  };
}

// The embedded resources PostgREST returns for each of these reads.
function withEmbeds(table: string, row: Row): Row {
  const guestOf = (id: unknown) => {
    const guest = tables.guests.find((g) => g.user_id === id);
    const user = tables.users.find((u) => u.id === id);
    return guest ? { ...guest, users: user, user } : null;
  };
  if (table === 'guests') {
    return { ...row, users: tables.users.find((u) => u.id === row.user_id) };
  }
  if (table === 'tickets') return { ...row, guests: guestOf(row.guest_id) };
  if (table === 'matches') {
    const event = tables.events.find((e) => e.id === row.event_id);
    return {
      ...row,
      guest1: guestOf(row.guest_id_1),
      guest2: guestOf(row.guest_id_2),
      event: event && { ...event, venue: event.venues },
      chats: tables.chats.find((c) => c.match_id === row.id) ?? null,
    };
  }
  return { ...row };
}

// Just enough of the supabase-js query builder for the four services. A
// table that isn't there answers like PostgREST does (PGRST205).
function from(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  let limit: number | null = null;
  let insert: Row | null = null;

  const run = (): { rows: Row[]; error: unknown } => {
    if (!(table in tables)) {
      return { rows: [], error: { code: 'PGRST205' } };
    }
    if (insert) {
      const row = { id: nextMatchId++, ...insert };
      tables[table].push(row);
      return { rows: [row], error: null };
    }
    let rows = tables[table].filter((row) => filters.every((f) => f(row)));
    if (limit !== null) rows = rows.slice(0, limit);
    return { rows: rows.map((row) => withEmbeds(table, row)), error: null };
  };

  const where = (filter: (row: Row) => boolean) => {
    filters.push(filter);
    return query;
  };
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) =>
      where((row) => row[column] === value),
    neq: (column: string, value: unknown) =>
      where((row) => row[column] !== value),
    is: (column: string, value: unknown) =>
      where((row) => (row[column] ?? null) === value),
    in: (column: string, values: unknown[]) =>
      where((row) => values.includes(row[column])),
    // Only the "a.eq.x,b.eq.y" form the services use.
    or: (expression: string) => {
      const terms = expression.split(',').map((term) => term.split('.eq.'));
      return where((row) =>
        terms.some(([column, value]) => row[column] === value),
      );
    },
    // The services order newest first; the seeds have one row per key.
    order: () => query,
    limit: (count: number, options?: { referencedTable?: string }) => {
      if (!options?.referencedTable) limit = count;
      return query;
    },
    insert: (values: Row) => {
      insert = values;
      return query;
    },
    maybeSingle: (): Promise<Result> => {
      const { rows, error } = run();
      return Promise.resolve({ data: rows[0] ?? null, error });
    },
    single: (): Promise<Result> => {
      const { rows, error } = run();
      return Promise.resolve(
        rows.length === 1
          ? { data: rows[0], error }
          : { data: null, error: error ?? { code: 'PGRST116' } },
      );
    },
    then: (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      const { rows, error } = run();
      return Promise.resolve<Result>({
        data: error ? null : rows,
        error,
      }).then(resolve, reject);
    },
  };
  return query;
}

const db = {
  from,
  // A like the limit allows.
  rpc: () =>
    Promise.resolve({
      data: {
        allowed: true,
        was_already_liked: false,
        likes_used: 1,
        like_limit: 3,
        eligible_guest_count: 2,
        limit_reached: false,
      },
      error: null,
    }),
};
const supabase = { getClient: () => db } as unknown as SupabaseService;
const guestSafety = new GuestSafetyService(supabase);
const guests = new GuestsService(supabase, {} as R2Service, guestSafety);
const tickets = new TicketsService(supabase, guestSafety);
const matches = new MatchesService(supabase, guestSafety);
const chats = new ChatsService(supabase, guestSafety);

const deckOf = async (userId: string) => {
  const deck = await guests.getSwipeableGuests(userId, EVENT);
  return {
    ...deck,
    ids: deck.profiles.map((p: { user_id: string }) => p.user_id).sort(),
  };
};
const guestListOf = async (userId: string) => {
  const attendees = await tickets.getEventAttendees(EVENT, userId);
  return { ...attendees, names: attendees.guestList.map((g) => g.name) };
};
const swipe = (userId: string, otherUserId: string) =>
  matches.submitSwipeDecision(userId, {
    other_user_id: otherUserId,
    event_id: EVENT,
    liked: true,
  });

beforeEach(() => {
  tables = seedTables();
  nextMatchId = 100;
});

describe('The Matches deck', () => {
  it('leaves out guests blocked either way and guests whose visibility leaves you out', async () => {
    const deck = await deckOf(ME);

    // Not BOJAN or CEDA (blocks), EMA (liked only ANA) or FILIP (hidden).
    expect(deck.ids).toEqual([ANA, DUNJA].sort());
    expect(deck).toMatchObject({
      eligible_guest_count: 2,
      visibility: 'everyone',
    });
  });

  it('leaves you out of the deck of a guest you blocked, and of one who blocked you', async () => {
    expect((await deckOf(BOJAN)).ids).not.toContain(ME);
    expect((await deckOf(CEDA)).ids).not.toContain(ME);
  });

  it('shows a guest who shows herself only to people she liked to those she liked', async () => {
    expect((await deckOf(ANA)).ids).toContain(EMA);
    expect((await deckOf(ME)).ids).not.toContain(EMA);
  });

  it('shows a hidden guest to nobody and nobody to them', async () => {
    for (const viewer of [ME, ANA, BOJAN, CEDA, DUNJA, EMA]) {
      expect((await deckOf(viewer)).ids).not.toContain(FILIP);
    }
    expect(await deckOf(FILIP)).toMatchObject({
      event_id: EVENT,
      profiles: [],
      visibility: 'hidden',
    });
  });

  it('shows everyone, as before, until the migration is applied', async () => {
    delete tables.guest_blocks;
    for (const guest of tables.guests) delete guest.visibility;

    expect((await deckOf(ME)).ids).toEqual(
      [ANA, BOJAN, CEDA, DUNJA, EMA, FILIP].sort(),
    );
  });
});

describe('The event guest list', () => {
  it('shows you and the guests you may see, and counts everyone', async () => {
    const list = await guestListOf(ME);

    expect(list.names).toEqual(['Mila', 'Ana', 'Dunja']);
    expect(list.hiddenCount).toBe(4);
    // The numbers count every guest going, hidden or not.
    expect(list).toMatchObject({ maxSpots: 100, females: 4, males: 3 });
    expect(list.averageAge).toEqual(expect.any(Number));
  });

  it('always lists you, even when you are hidden', async () => {
    const list = await guestListOf(FILIP);

    expect(list.names).toContain('Filip');
    expect(list.names).not.toContain('Dunja');
    expect(list.names).not.toContain('Ema');
  });

  it('leaves each of two blocked guests off the other’s list', async () => {
    expect((await guestListOf(BOJAN)).names).not.toContain('Mila');
    expect((await guestListOf(CEDA)).names).not.toContain('Mila');
    expect((await guestListOf(ME)).names).not.toContain('Bojan');
    expect((await guestListOf(ME)).names).not.toContain('Ceda');
  });

  it('shows no one to someone not going, only the numbers', async () => {
    const list = await guestListOf(OUTSIDER);

    expect(list).toMatchObject({
      guestList: [],
      hiddenCount: 7,
      females: 4,
      males: 3,
    });
  });

  it('lists everyone going, as before, until the migration is applied', async () => {
    delete tables.guest_blocks;
    for (const guest of tables.guests) delete guest.visibility;

    const list = await guestListOf(ME);
    expect(list.names).toHaveLength(7);
    expect(list.hiddenCount).toBe(0);
  });
});

describe('The inbox and chats', () => {
  beforeEach(() => {
    tables.matches = [
      { id: 1, guest_id_1: ANA, guest_id_2: ME, event_id: EVENT },
      { id: 2, guest_id_1: BOJAN, guest_id_2: ME, event_id: EVENT },
      { id: 3, guest_id_1: CEDA, guest_id_2: ME, event_id: EVENT },
    ];
    tables.chats = [
      { id: 'chat-ana', match_id: 1, event_id: EVENT },
      { id: 'chat-bojan', match_id: 2, event_id: EVENT },
    ];
  });

  it('drops matches with guests blocked either way from the inbox', async () => {
    const inbox = await matches.getMyMatches(ME);

    expect(inbox.map((match) => match.id)).toEqual([1]);
    expect((await matches.getMyMatches(BOJAN)).map((m) => m.id)).toEqual([]);
    expect((await matches.getMyMatches(CEDA)).map((m) => m.id)).toEqual([]);
  });

  it('closes a chat to both guests once one blocked the other', async () => {
    await expect(chats.getChatForParticipant('chat-ana', ME)).resolves.toEqual(
      expect.objectContaining({ id: 'chat-ana' }),
    );
    for (const userId of [ME, BOJAN]) {
      await expect(
        chats.getChatForParticipant('chat-bojan', userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    }
  });
});

describe('Swiping', () => {
  it.each([
    ['a guest you blocked', BOJAN],
    ['a guest who blocked you', CEDA],
    ['a guest who shows herself only to people she liked', EMA],
    ['a hidden guest', FILIP],
  ])(
    'answers a like of %s as not found and records nothing',
    async (_, other) => {
      await expect(swipe(ME, other)).rejects.toBeInstanceOf(NotFoundException);
      expect(tables.matches).toStrictEqual([]);
    },
  );

  it('lets you like back a guest who shows herself only to people she liked', async () => {
    // DUNJA liked ME, so the like back is a match.
    await expect(swipe(ME, DUNJA)).resolves.toMatchObject({ matched: true });
    expect(tables.matches).toMatchObject([
      { guest_id_1: DUNJA, guest_id_2: ME, event_id: EVENT },
    ]);
  });

  it('refuses every swipe from a hidden guest', async () => {
    await expect(swipe(FILIP, ANA)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
