/**
 * The Matches deck a page at a time (Maskenbal B2): GET /guests/swipeable
 * asks get_swipe_deck for one page and its counts, and reads the tables as
 * before while that function is missing. Runs the real GuestsService over
 * in-memory tables and a fake rpc.
 */
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { GuestsService } from './guests.service';

const CALLER = 'user_caller';
const ANA = 'user_ana';
const BOJAN = 'user_bojan';
const EVENT = '6b7f3c1e-2a4d-4e8f-9b0a-1c2d3e4f5a6b';
const CURSOR_1 = '0000029961905018c607b5549297fa253ad0f23e4ab5';
const CURSOR_2 = '000002996190e61e7bac57198c70119b156802ab041b';
const MISSING_FUNCTION = {
  code: 'PGRST202',
  message: 'Could not find the function public.get_swipe_deck',
};

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };
type RpcCall = { fn: string; args: Row };

let tables: Record<string, Row[]>;
let rpcResult: Result;
let rpcCalls: RpcCall[];

// Just enough of the supabase-js query builder for GuestsService and
// GuestSafetyService. Rows carry their embedded resources already, as
// PostgREST returns them.
function from(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  const rows = () =>
    (tables[table] ?? []).filter((row) => filters.every((f) => f(row)));
  const where = (filter: (row: Row) => boolean) => {
    filters.push(filter);
    return query;
  };
  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
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
    maybeSingle: () =>
      Promise.resolve<Result>({ data: rows()[0] ?? null, error: null }),
    then: (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) =>
      Promise.resolve<Result>({ data: rows(), error: null }).then(
        resolve,
        reject,
      ),
  };
  return query;
}

const db = {
  from,
  rpc: (fn: string, args: Row) => {
    rpcCalls.push({ fn, args });
    return Promise.resolve(rpcResult);
  },
};
const supabase = { getClient: () => db } as unknown as SupabaseService;
const guests = new GuestsService(
  supabase,
  {} as R2Service,
  new GuestSafetyService(supabase),
  {
    ensureUserRow: () => Promise.resolve(),
  } as unknown as UserProvisioningService,
);

const guestRow = (userId: string, name: string, gender: string): Row => ({
  user_id: userId,
  gender,
  birthday: '1995-05-05T00:00:00+00:00',
  interests: ['Music'],
  picture_urls: [`https://cdn.example.com/${userId}.webp`],
  bio: `Bio of ${name}`,
  visibility: 'everyone',
  users: { first_name: name, last_name: 'Test', avatar_url: null },
});

const checkedIn = (userId: string): Row => ({
  id: `session-${userId}`,
  user_id: userId,
  event_id: EVENT,
  entered_at: '2026-12-19T21:00:00+00:00',
  exited_at: null,
});

// A page as get_swipe_deck returns it.
const deckPage = {
  eligible_guest_count: 12,
  present_guest_count: 30,
  likes_used: 4,
  profiles: [
    {
      user_id: ANA,
      first_name: 'Ana',
      last_name: null,
      avatar_url: 'https://cdn.example.com/ana-avatar.webp',
      gender: 'female',
      picture_urls: ['https://cdn.example.com/ana.webp'],
      age: 31,
      interests: ['Music'],
      bio: 'Bio of Ana',
      liked_by_me: true,
    },
    {
      user_id: BOJAN,
      first_name: 'Bojan',
      last_name: 'Test',
      avatar_url: null,
      gender: 'male',
      picture_urls: null,
      age: null,
      interests: null,
      bio: '   ',
      liked_by_me: false,
    },
  ],
  next_cursor: CURSOR_2,
  end_cursor: CURSOR_2,
};

beforeEach(() => {
  tables = {
    event_sessions: [checkedIn(CALLER), checkedIn(ANA), checkedIn(BOJAN)],
    guests: [
      guestRow(CALLER, 'Caller', 'male'),
      guestRow(ANA, 'Ana', 'female'),
      guestRow(BOJAN, 'Bojan', 'male'),
    ],
    guest_swipes: [
      {
        swiper_user_id: CALLER,
        swiped_user_id: ANA,
        event_id: EVENT,
        liked: true,
      },
    ],
    matches: [],
    events: [{ id: EVENT, title: 'Maskenbal', venues: { name: 'KST' } }],
  };
  rpcResult = { data: deckPage, error: null };
  rpcCalls = [];
});

describe('The Matches deck, a page at a time', () => {
  it('asks get_swipe_deck for one page, with the filters as the like limit counts them', async () => {
    await guests.getSwipeableGuests(
      CALLER,
      EVENT,
      {
        genderFilter: 'robot',
        ageMin: 40,
        ageMax: 20,
        selectedInterests: [' Music ', 'Music', ''],
      },
      { cursor: CURSOR_1, limit: 10 },
    );

    expect(rpcCalls).toEqual([
      {
        fn: 'get_swipe_deck',
        args: {
          p_viewer_id: CALLER,
          p_event_id: EVENT,
          p_gender_filter: 'everyone',
          p_age_min: 20,
          p_age_max: 40,
          p_interest_filters: ['Music'],
          p_cursor: CURSOR_1,
          p_limit: 10,
        },
      },
    ]);
  });

  it('sends the page as the app reads it, with the counts and both cursors', async () => {
    const deck = await guests.getSwipeableGuests(CALLER, EVENT);

    expect(deck).toEqual({
      event_id: EVENT,
      event_title: 'Maskenbal',
      event_venue: 'KST',
      profiles: [
        {
          user_id: ANA,
          event_id: EVENT,
          first_name: 'Ana',
          last_name: null,
          avatar_url: 'https://cdn.example.com/ana-avatar.webp',
          gender: 'female',
          picture_urls: ['https://cdn.example.com/ana.webp'],
          age: 31,
          interests: ['Music'],
          bio: 'Bio of Ana',
          liked_by_me: true,
        },
        {
          user_id: BOJAN,
          event_id: EVENT,
          first_name: 'Bojan',
          last_name: 'Test',
          avatar_url: null,
          gender: 'male',
          picture_urls: [],
          age: 0,
          interests: [],
          bio: null,
          liked_by_me: false,
        },
      ],
      likes_used: 4,
      // 20% of 12 is under the minimum of 3, and 4 likes are already used.
      like_limit: 4,
      eligible_guest_count: 12,
      present_guest_count: 30,
      visibility: 'everyone',
      next_cursor: CURSOR_2,
      end_cursor: CURSOR_2,
    });
  });

  it('asks for 25 profiles unless told otherwise, and never more than 50', async () => {
    await guests.getSwipeableGuests(CALLER, EVENT);
    await guests.getSwipeableGuests(CALLER, EVENT, undefined, { limit: 500 });
    await guests.getSwipeableGuests(CALLER, EVENT, undefined, { limit: -3 });
    await guests.getSwipeableGuests(CALLER, EVENT, undefined, { limit: 0 });

    expect(rpcCalls.map((call) => call.args.p_limit)).toEqual([25, 50, 0, 0]);
    expect(rpcCalls.map((call) => call.args.p_cursor)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('refuses a cursor it never handed out', async () => {
    for (const cursor of [
      'abc',
      CURSOR_1.toUpperCase(),
      `${CURSOR_1}0`,
      "000002996190' OR 1=1 --",
    ]) {
      await expect(
        guests.getSwipeableGuests(CALLER, EVENT, undefined, { cursor }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(rpcCalls).toEqual([]);
  });

  it('gives a hidden caller nobody, without asking for the deck', async () => {
    tables.guests[0].visibility = 'hidden';

    const deck = await guests.getSwipeableGuests(CALLER, EVENT);

    expect(deck.profiles).toEqual([]);
    expect(deck.visibility).toBe('hidden');
    expect(rpcCalls).toEqual([]);
  });

  it('gives someone not at the event nobody, without asking for the deck', async () => {
    tables.event_sessions = [checkedIn(ANA)];

    const deck = await guests.getSwipeableGuests(CALLER, EVENT);

    expect(deck.profiles).toEqual([]);
    expect(rpcCalls).toEqual([]);
  });

  it('passes on any other database error instead of falling back', async () => {
    const timeout = {
      code: '57014',
      message: 'canceling statement due to statement timeout',
    };
    rpcResult = { data: null, error: timeout };

    await expect(guests.getSwipeableGuests(CALLER, EVENT)).rejects.toBe(
      timeout,
    );
  });
});

describe('The Matches deck before the paging migration', () => {
  beforeEach(() => {
    rpcResult = { data: null, error: MISSING_FUNCTION };
  });

  it('reads the whole deck from the tables, as one page with no cursor', async () => {
    const deck = await guests.getSwipeableGuests(CALLER, EVENT, {
      genderFilter: 'female',
    });

    // The app filters the deck; the counts are for the filters.
    expect(deck.profiles.map((p) => p.user_id).sort()).toEqual([ANA, BOJAN]);
    expect(deck.eligible_guest_count).toBe(1);
    expect(deck.present_guest_count).toBe(2);
    expect(deck.likes_used).toBe(1);
    expect(deck.next_cursor).toBeNull();
    expect(deck.end_cursor).toBeNull();
  });

  it('answers a later page, or the counts alone, with the counts and no profiles', async () => {
    const later = await guests.getSwipeableGuests(CALLER, EVENT, undefined, {
      cursor: CURSOR_1,
    });
    const countsOnly = await guests.getSwipeableGuests(
      CALLER,
      EVENT,
      undefined,
      { limit: 0 },
    );

    for (const deck of [later, countsOnly]) {
      expect(deck.profiles).toEqual([]);
      expect(deck.eligible_guest_count).toBe(2);
      expect(deck.present_guest_count).toBe(2);
      expect(deck.likes_used).toBe(1);
      expect(deck.next_cursor).toBeNull();
    }
  });
});
