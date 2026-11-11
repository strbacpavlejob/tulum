/**
 * The event guest list a page at a time (Maskenbal B2): GET
 * /tickets/attendees asks get_event_guest_list for the numbers and one page
 * of guests, and reads the tables as before while that function is missing.
 * Runs the real TicketsService over in-memory tables and a fake rpc.
 */
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TicketsService } from './tickets.service';

const ME = 'user_me';
const ANA = 'user_ana';
const JOVANA = 'user_jovana';
const EVENT = '6b7f3c1e-2a4d-4e8f-9b0a-1c2d3e4f5a6b';
// After the viewer's own row: 1, then the last ticket id on the page.
const CURSOR = '1d2f0c8a4-5b6e-4c7d-8e9f-0a1b2c3d4e5f';
const MISSING_FUNCTION = {
  code: 'PGRST202',
  message: 'Could not find the function public.get_event_guest_list',
};

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };
type RpcCall = { fn: string; args: Row };

let tables: Record<string, Row[]>;
let rpcResult: Result;
let rpcCalls: RpcCall[];

// Just enough of the supabase-js query builder for TicketsService and
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
    eq: (column: string, value: unknown) =>
      where((row) => row[column] === value),
    // Only the "a.eq.x,b.eq.y" form the services use.
    or: (expression: string) => {
      const terms = expression.split(',').map((term) => term.split('.eq.'));
      return where((row) =>
        terms.some(([column, value]) => row[column] === value),
      );
    },
    single: () =>
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
const tickets = new TicketsService(supabase, new GuestSafetyService(supabase));

const ticketRow = (
  guestId: string,
  name: string,
  gender: string,
  visibility: string,
): Row => ({
  guest_id: guestId,
  event_id: EVENT,
  guests: {
    gender,
    birthday: '1995-05-05T00:00:00+00:00',
    visibility,
    users: { first_name: name, last_name: 'Test', avatar_url: null },
  },
});

// A page as get_event_guest_list returns it.
const listPage = {
  max_spots: 5000,
  going_count: 9,
  listed_count: 5,
  females: 5,
  males: 4,
  average_age: 31,
  guests: [
    {
      first_name: 'Me',
      last_name: 'Test',
      avatar_url: 'https://cdn.example.com/me.webp',
      age: 28,
      gender: 'male',
      is_viewer: true,
    },
    {
      first_name: 'Ana',
      last_name: null,
      avatar_url: null,
      age: 25,
      gender: 'female',
      is_viewer: false,
    },
    {
      first_name: null,
      last_name: null,
      avatar_url: null,
      age: null,
      gender: null,
      is_viewer: false,
    },
  ],
  next_cursor: CURSOR,
};

beforeEach(() => {
  tables = {
    tickets: [
      ticketRow(ME, 'Me', 'male', 'everyone'),
      ticketRow(ANA, 'Ana', 'female', 'everyone'),
      ticketRow(JOVANA, 'Jovana', 'female', 'hidden'),
    ],
    events: [{ id: EVENT, venues: { capacity: 300 } }],
    guest_blocks: [],
    guest_swipes: [],
  };
  rpcResult = { data: listPage, error: null };
  rpcCalls = [];
});

describe('The event guest list, a page at a time', () => {
  it('asks get_event_guest_list for 30 guests unless told otherwise, and never more than 50', async () => {
    await tickets.getEventAttendees(EVENT, ME);
    await tickets.getEventAttendees(EVENT, ME, { cursor: CURSOR, limit: 10 });
    await tickets.getEventAttendees(EVENT, ME, { limit: 500 });
    await tickets.getEventAttendees(EVENT, ME, { limit: 0 });

    expect(rpcCalls).toEqual([
      {
        fn: 'get_event_guest_list',
        args: {
          p_viewer_id: ME,
          p_event_id: EVENT,
          p_cursor: null,
          p_limit: 30,
        },
      },
      {
        fn: 'get_event_guest_list',
        args: {
          p_viewer_id: ME,
          p_event_id: EVENT,
          p_cursor: CURSOR,
          p_limit: 10,
        },
      },
      {
        fn: 'get_event_guest_list',
        args: {
          p_viewer_id: ME,
          p_event_id: EVENT,
          p_cursor: null,
          p_limit: 50,
        },
      },
      {
        fn: 'get_event_guest_list',
        args: {
          p_viewer_id: ME,
          p_event_id: EVENT,
          p_cursor: null,
          p_limit: 0,
        },
      },
    ]);
  });

  it('sends the page as the app reads it: everyone going counts, hiddenCount is who the list leaves out', async () => {
    const list = await tickets.getEventAttendees(EVENT, ME);

    expect(list).toEqual({
      maxSpots: 5000,
      averageAge: 31,
      females: 5,
      males: 4,
      goingCount: 9,
      guestList: [
        {
          name: 'Me Test',
          age: 28,
          gender: 'male',
          uri: 'https://cdn.example.com/me.webp',
          isViewer: true,
        },
        { name: 'Ana', age: 25, gender: 'female', uri: null, isViewer: false },
        { name: 'Guest', age: null, gender: null, uri: null, isViewer: false },
      ],
      hiddenCount: 4,
      nextCursor: CURSOR,
    });
  });

  it('refuses a cursor it never handed out', async () => {
    for (const cursor of [
      'abc',
      `2${CURSOR.slice(1)}`,
      CURSOR.toUpperCase(),
      "1' OR 1=1 --",
    ]) {
      await expect(
        tickets.getEventAttendees(EVENT, ME, { cursor }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(rpcCalls).toEqual([]);
  });

  it('passes on any other database error instead of falling back', async () => {
    const timeout = {
      code: '57014',
      message: 'canceling statement due to statement timeout',
    };
    rpcResult = { data: null, error: timeout };

    await expect(tickets.getEventAttendees(EVENT, ME)).rejects.toBe(timeout);
  });
});

describe('The event guest list before the paging migration', () => {
  beforeEach(() => {
    rpcResult = { data: null, error: MISSING_FUNCTION };
  });

  it('reads the whole list from the tables, as one page with no cursor', async () => {
    const list = await tickets.getEventAttendees(EVENT, ME);

    expect(list.goingCount).toBe(3);
    expect(list.guestList).toEqual([
      {
        name: 'Me Test',
        age: expect.any(Number),
        gender: 'male',
        uri: null,
        isViewer: true,
      },
      {
        name: 'Ana Test',
        age: expect.any(Number),
        gender: 'female',
        uri: null,
        isViewer: false,
      },
    ]);
    expect(list.hiddenCount).toBe(1);
    expect(list.maxSpots).toBe(300);
    expect(list.nextCursor).toBeNull();
  });

  it('answers a later page, or the numbers alone, with the numbers and no guests', async () => {
    const later = await tickets.getEventAttendees(EVENT, ME, {
      cursor: CURSOR,
    });
    const numbersOnly = await tickets.getEventAttendees(EVENT, ME, {
      limit: 0,
    });

    for (const list of [later, numbersOnly]) {
      expect(list.guestList).toEqual([]);
      expect(list.goingCount).toBe(3);
      expect(list.hiddenCount).toBe(1);
      expect(list.nextCursor).toBeNull();
    }
  });
});
