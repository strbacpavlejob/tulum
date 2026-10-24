/**
 * BUG-023: the map pins from GET /events/active. EventsCrudService runs over
 * in-memory tables; a venue with several events must still get one pin.
 */
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { FavoritesService } from '../favorites/favorites.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GetActiveEventsDto } from './dto/get-active-events.dto';
import { EventsCrudService } from './events-crud.service';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };
type Pin = { venue_id: string; venue_name: string; instances: number };

const NOW = '2026-10-24T10:00:00.000Z';
const BEN_AKIBA = '0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';
const ZAPPA = '1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f';
const CLUB = '2d3e4f5a-6b7c-4d8e-8f9a-1b2c3d4e5f6a';

const venue = (id: string, name: string, venueType: string): Row => ({
  id,
  name,
  latitude: 44.8,
  longitude: 20.45,
  address: `${name} 1`,
  capacity: 100,
  venue_type: venueType,
  picture_url: null,
});

// Times as supabase-js returns them: UTC without an offset.
const event = (title: string, venueId: string, start: string): Row => ({
  id: title,
  title,
  picture_url: null,
  scraper: null,
  venue_id: venueId,
  status: 'active',
  start_date_time: start,
  end_date_time: start.replace('T20:', 'T23:'),
  tags: [],
});

const tables: Record<string, Row[]> = {
  events: [
    event('Ben Akiba Monday', BEN_AKIBA, '2026-10-26T20:00:00'),
    event('Zappa Monday', ZAPPA, '2026-10-26T20:30:00'),
    event('Ben Akiba Tuesday', BEN_AKIBA, '2026-10-27T20:00:00'),
    event('Club Wednesday', CLUB, '2026-10-28T20:00:00'),
    event('Ben Akiba Thursday', BEN_AKIBA, '2026-10-29T20:00:00'),
  ],
  venues: [
    venue(BEN_AKIBA, 'Ben Akiba', 'bar'),
    venue(ZAPPA, 'Zappa Baza', 'bar'),
    venue(CLUB, 'Club', 'club'),
  ],
  tickets: [],
};

const clockTimeMs = (value: unknown) =>
  Date.parse(`${String(value).replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, '')}Z`);

function from(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  const where = (filter: (row: Row) => boolean) => {
    filters.push(filter);
    return query;
  };
  // The events table is already in start order, as the query asks for.
  const query = {
    select: () => query,
    order: () => query,
    eq: (column: string, value: unknown) =>
      where((row) => row[column] === value),
    in: (column: string, values: unknown[]) =>
      where((row) => values.includes(row[column])),
    gte: (column: string, value: string) =>
      where((row) => clockTimeMs(row[column]) >= clockTimeMs(value)),
    lte: (column: string, value: string) =>
      where((row) => clockTimeMs(row[column]) <= clockTimeMs(value)),
    then: (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({
        data: (tables[table] ?? []).filter((row) =>
          filters.every((f) => f(row)),
        ),
        error: null,
      }).then(resolve, reject),
  };
  return query;
}

const service = new EventsCrudService(
  { getClient: () => ({ from }) } as unknown as SupabaseService,
  {} as R2Service,
  {} as FavoritesService,
);

const listing = async (filters: GetActiveEventsDto = {}) =>
  (await service.getActiveEvents(filters)) as {
    events: { name: string; venue_id: string }[];
    pins: Pin[];
  };

describe('GET /events/active map pins (BUG-023)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(NOW) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('sends one pin per venue, with its number of events as instances', async () => {
    const { pins } = await listing();

    expect(pins.map((p) => [p.venue_name, p.instances])).toEqual([
      ['Ben Akiba', 3],
      ['Zappa Baza', 1],
      ['Club', 1],
    ]);
    expect(new Set(pins.map((p) => p.venue_id)).size).toBe(pins.length);
  });

  it('still lists every event', async () => {
    const { events } = await listing();

    expect(events.map((e) => e.name)).toEqual([
      'Ben Akiba Monday',
      'Zappa Monday',
      'Ben Akiba Tuesday',
      'Club Wednesday',
      'Ben Akiba Thursday',
    ]);
  });

  it('gives no pin to a venue whose events are filtered out', async () => {
    const { events, pins } = await listing({ venue_type: 'bar' });

    expect(pins.map((p) => p.venue_name)).toEqual(['Ben Akiba', 'Zappa Baza']);
    expect(events).toHaveLength(4);
  });
});
