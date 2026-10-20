import { describe, expect, it } from '@jest/globals';
import { FavoritesService } from '../favorites/favorites.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EventsCrudService } from './events-crud.service';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };

interface Query extends PromiseLike<Result> {
  select(): Query;
  eq(): Query;
  in(): Query;
  gte(): Query;
  lte(): Query;
  order(): Query;
  single(): Promise<Result>;
}

const EVENT_ID = '60028eae-a9f8-4235-931c-ee9dc3f03cec';
const VENUE_ID = '7a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d';

// supabase-js returns events.start_date_time, a timestamp without time zone
// column holding UTC, with no offset. 19:00 UTC is 20:00 in Belgrade.
const tables: Record<string, Row[]> = {
  events: [
    {
      id: EVENT_ID,
      title: 'Pat Todd & The Rankoutsiders',
      description: '',
      picture_url: null,
      scraper: null,
      venue_id: VENUE_ID,
      start_date_time: '2026-10-29T19:00:00',
      tags: [],
    },
  ],
  venues: [
    {
      id: VENUE_ID,
      name: 'Zappa Baza',
      latitude: 44.8,
      longitude: 20.45,
      address: 'Kralja Petra 1',
      picture_url: null,
      contact_id: null,
      requires_reservation: false,
    },
  ],
  tickets: [],
};

// Returns every row of the table; the filters don't matter here.
function from(table: string): Query {
  const rows = tables[table] ?? [];
  const query: Query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    gte: () => query,
    lte: () => query,
    order: () => query,
    single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (onfulfilled, onrejected) =>
      Promise.resolve({ data: rows, error: null }).then(
        onfulfilled,
        onrejected,
      ),
  };
  return query;
}

const service = new EventsCrudService(
  { getClient: () => ({ from }) } as unknown as SupabaseService,
  {} as R2Service,
  {} as FavoritesService,
);

describe('EventsCrudService start times (BUG-009)', () => {
  it('GET /events/active sends the start time as a UTC instant', async () => {
    const listing = (await service.getActiveEvents()) as {
      events: { id: string; date: unknown }[];
    };
    expect(listing.events).toEqual([
      expect.objectContaining({
        id: EVENT_ID,
        date: '2026-10-29T19:00:00.000Z',
      }),
    ]);
  });

  it('GET /events/active/:id sends the start time as a UTC instant', async () => {
    const details = await service.getActiveEventById(EVENT_ID);
    expect(details).toMatchObject({
      id: EVENT_ID,
      date: '2026-10-29T19:00:00.000Z',
    });
  });
});
