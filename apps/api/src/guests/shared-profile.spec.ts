/**
 * What one guest's profile shows to another: the bio on the Matches deck,
 * every profile detail to the guest they matched with, and nothing else from
 * the guests row. Runs the real GuestsService and MatchesService over
 * in-memory tables.
 */
import { describe, expect, it } from '@jest/globals';
import { MatchesService } from '../matches/matches.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GuestsService } from './guests.service';

const CALLER = 'user_caller';
const OTHER = 'user_other';
const EVENT_ID = 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: null };

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

// Every column filled in, including the ones no other guest may see.
const guestColumns = (userId: string, name: string): Row => ({
  user_id: userId,
  gender: 'female',
  seeking: 'party',
  interested_in: ['male'],
  interests: ['Music', 'Travel'],
  picture_urls: [`https://cdn.example.com/${userId}.webp`],
  birthday: '1995-05-05T00:00:00+00:00',
  venue_types: ['bar'],
  bio: `Bio of ${name}`,
  work: 'Designer',
  education: 'FDU Belgrade',
  height_cm: 170,
  has_children: 'no',
  drinking: 'socially',
  smoking: 'never',
  languages: ['Serbian', 'English'],
  relationship_status: 'single',
  sexuality: 'straight',
  star_sign: 'Leo',
  pets: ['cat'],
  religion: 'agnostic',
});

const names = (name: string) => ({
  first_name: name,
  last_name: 'Test',
  avatar_url: null,
});

const allDetails = {
  bio: 'Bio of Ana',
  seeking: 'party',
  work: 'Designer',
  education: 'FDU Belgrade',
  height_cm: 170,
  languages: ['Serbian', 'English'],
  drinking: 'socially',
  smoking: 'never',
  pets: ['cat'],
  star_sign: 'Leo',
  relationship_status: 'single',
  sexuality: 'straight',
  has_children: 'no',
  religion: 'agnostic',
};

// Just enough of the supabase-js query builder for the two services. Rows
// carry their embedded resources already, as PostgREST returns them.
function fakeSupabase(tables: Record<string, Row[]>) {
  const from = (table: string) => {
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
  };
  return { getClient: () => ({ from }) } as unknown as SupabaseService;
}

describe('Profile details other guests see', () => {
  it('the Matches deck shows the bio and none of the other details', async () => {
    const supabase = fakeSupabase({
      event_sessions: [
        { id: 1, event_id: EVENT_ID, user_id: CALLER, exited_at: null },
        { id: 2, event_id: EVENT_ID, user_id: OTHER, exited_at: null },
      ],
      guests: [{ ...guestColumns(OTHER, 'Ana'), users: names('Ana') }],
      events: [{ id: EVENT_ID, title: 'Jazz night', venues: { name: 'Bar' } }],
    });
    const guests = new GuestsService(supabase, {} as R2Service);

    const result = await guests.getSwipeableGuests(CALLER, EVENT_ID);

    expect(result.profiles).toStrictEqual([
      {
        user_id: OTHER,
        event_id: EVENT_ID,
        first_name: 'Ana',
        last_name: 'Test',
        avatar_url: null,
        gender: 'female',
        picture_urls: [`https://cdn.example.com/${OTHER}.webp`],
        age: expect.any(Number),
        interests: ['Music', 'Travel'],
        bio: 'Bio of Ana',
        liked_by_me: false,
      },
    ]);
  });

  it('a match sees every profile detail, but not the private columns', async () => {
    const supabase = fakeSupabase({
      matches: [
        {
          id: 7,
          event_id: EVENT_ID,
          guest_id_1: CALLER,
          guest_id_2: OTHER,
          matched_at: hoursFromNow(-1),
          guest1: { ...guestColumns(CALLER, 'Caller'), user: names('Caller') },
          guest2: { ...guestColumns(OTHER, 'Ana'), user: names('Ana') },
          event: {
            id: EVENT_ID,
            title: 'Jazz night',
            end_date_time: hoursFromNow(3),
            venue: { name: 'Bar', latitude: 44.8, longitude: 20.4 },
          },
          chats: null,
        },
      ],
    });
    const matches = new MatchesService(supabase);

    const [match] = await matches.getMyMatches(CALLER);

    // No gender, interested_in or venue_types.
    expect(match.other_guest).toStrictEqual({
      user_id: OTHER,
      first_name: 'Ana',
      last_name: 'Test',
      avatar_url: null,
      picture_urls: [`https://cdn.example.com/${OTHER}.webp`],
      birthday: '1995-05-05T00:00:00+00:00',
      interests: ['Music', 'Travel'],
      ...allDetails,
    });
  });

  it('a guests row from before the migration gives empty details', async () => {
    const preMigration = {
      user_id: OTHER,
      gender: 'female',
      seeking: 'casual',
      interested_in: ['male'],
      interests: [],
      picture_urls: [],
      birthday: '1995-05-05T00:00:00+00:00',
      venue_types: [],
      bio: null,
      user: names('Ana'),
    };
    const supabase = fakeSupabase({
      matches: [
        {
          id: 8,
          event_id: EVENT_ID,
          guest_id_1: OTHER,
          guest_id_2: CALLER,
          matched_at: hoursFromNow(-1),
          guest1: preMigration,
          guest2: { ...guestColumns(CALLER, 'Caller'), user: names('Caller') },
          event: {
            id: EVENT_ID,
            title: 'Jazz night',
            end_date_time: hoursFromNow(3),
            venue: null,
          },
          chats: null,
        },
      ],
    });
    const matches = new MatchesService(supabase);

    const [match] = await matches.getMyMatches(CALLER);

    expect(match.other_guest).toMatchObject({
      user_id: OTHER,
      bio: null,
      seeking: 'casual',
      work: null,
      education: null,
      height_cm: null,
      languages: [],
      pets: [],
      sexuality: null,
      religion: null,
    });
  });
});
