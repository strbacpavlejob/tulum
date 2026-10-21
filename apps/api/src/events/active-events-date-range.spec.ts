/**
 * BUG-013: the date range on GET /events/active. EventsCrudService runs over
 * in-memory tables whose filters compare times the way Postgres does for
 * these timestamp without time zone columns.
 */
import { BadRequestException } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { FavoritesService } from '../favorites/favorites.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GetActiveEventsDto } from './dto/get-active-events.dto';
import { EventsCrudService } from './events-crud.service';

type Row = Record<string, unknown>;
type Result = { data: unknown; error: unknown };

// 01:30 UTC on Saturday. The ranges below are whole UTC days, as a client in
// UTC sends them.
const NOW = '2026-10-24T01:30:00.000Z';
const VENUE_ID = '7a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d';

const event = (title: string, start: string, end: string): Row => ({
  id: title,
  title,
  picture_url: null,
  scraper: null,
  venue_id: VENUE_ID,
  status: 'active',
  start_date_time: start,
  end_date_time: end,
  tags: [],
});

// Times as supabase-js returns them: UTC without an offset.
const tables: Record<string, Row[]> = {
  events: [
    event('Ended', '2026-10-23T20:00:00', '2026-10-24T01:00:00'),
    event(
      'Friday party (on now)',
      '2026-10-23T23:00:00',
      '2026-10-24T04:00:00',
    ),
    event('Saturday night', '2026-10-24T21:00:00', '2026-10-25T02:00:00'),
    event('Sunday afternoon', '2026-10-25T15:00:00', '2026-10-25T18:00:00'),
    event('Monday 19:30', '2026-10-26T19:30:00', '2026-10-26T23:30:00'),
    event('Tuesday', '2026-10-27T20:00:00', '2026-10-28T00:00:00'),
  ],
  venues: [
    {
      id: VENUE_ID,
      name: 'Zappa Baza',
      latitude: 44.8,
      longitude: 20.45,
      address: 'Kralja Petra 1',
      capacity: 80,
      venue_type: 'bar',
      picture_url: null,
    },
  ],
  tickets: [],
};

// Postgres compares a timestamp without time zone column with the value's
// clock time and ignores an offset in the value.
const clockTimeMs = (value: unknown) =>
  Date.parse(`${String(value).replace(/(?:Z|[+-]\d{2}:?\d{2})$/i, '')}Z`);

function from(table: string) {
  const filters: ((row: Row) => boolean)[] = [];
  const where = (filter: (row: Row) => boolean) => {
    filters.push(filter);
    return query;
  };
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

const listedTitles = async (filters: GetActiveEventsDto) => {
  const listing = (await service.getActiveEvents(filters)) as
    | { events: { name: string }[] }
    | [];
  return Array.isArray(listing) ? [] : listing.events.map((e) => e.name);
};

describe('GET /events/active date range (BUG-013)', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(NOW) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('a range that starts today keeps the events that are on now', async () => {
    await expect(
      listedTitles({
        date_start: '2026-10-24T00:00:00.000Z',
        date_end: '2026-10-26T23:59:59.999Z',
      }),
    ).resolves.toEqual([
      'Friday party (on now)',
      'Saturday night',
      'Sunday afternoon',
      'Monday 19:30',
    ]);
  });

  it('keeps them for an older app that sends the time it loaded', async () => {
    await expect(
      listedTitles({
        date_start: '2026-10-24T01:10:00.000Z',
        date_end: '2026-10-31T01:10:00.000Z',
      }),
    ).resolves.toEqual([
      'Friday party (on now)',
      'Saturday night',
      'Sunday afternoon',
      'Monday 19:30',
      'Tuesday',
    ]);
  });

  it('a later range lists only the events that start in it', async () => {
    // Saturday night runs into Sunday, but it starts before the range.
    await expect(
      listedTitles({
        date_start: '2026-10-25T00:00:00.000Z',
        date_end: '2026-10-26T23:59:59.999Z',
      }),
    ).resolves.toEqual(['Sunday afternoon', 'Monday 19:30']);
  });

  it('reads an offset in date_start and date_end as part of the instant', async () => {
    // 14:30 and 19:00 UTC; with the offsets dropped they would be 15:30 and
    // 20:00, and the list would be Monday 19:30 alone.
    await expect(
      listedTitles({
        date_start: '2026-10-25T15:30:00+01:00',
        date_end: '2026-10-26T20:00:00+0100',
      }),
    ).resolves.toEqual(['Sunday afternoon']);
  });

  it('refuses an ISO 8601 value it cannot read as an instant', async () => {
    for (const filters of [
      { date_start: '2026-W43' },
      { date_end: '2026-300' },
    ]) {
      await expect(service.getActiveEvents(filters)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
  });
});
