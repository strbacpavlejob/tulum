import { describe, expect, it } from '@jest/globals';
import {
  parseDbTimestamp,
  parseDbTimestampMs,
  toUtcIsoString,
  withUtcEventTimes,
} from './db-timestamp';

// The result must not depend on the server's time zone; run with a non-UTC
// TZ (e.g. TZ=Europe/Belgrade) to catch a value parsed as local time.
describe('db-timestamp helpers', () => {
  it('reads a value without an offset as UTC', () => {
    // How supabase-js returns events.start_date_time.
    expect(parseDbTimestampMs('2026-10-29T19:00:00')).toBe(
      Date.UTC(2026, 9, 29, 19),
    );
    expect(toUtcIsoString('2026-10-29T19:00:00')).toBe(
      '2026-10-29T19:00:00.000Z',
    );
    expect(toUtcIsoString('2026-10-08T19:55:35.587')).toBe(
      '2026-10-08T19:55:35.587Z',
    );
  });

  it('keeps the instant of a value with an offset', () => {
    expect(toUtcIsoString('2026-10-29T19:00:00.000Z')).toBe(
      '2026-10-29T19:00:00.000Z',
    );
    expect(toUtcIsoString('2026-10-29T20:00:00+01:00')).toBe(
      '2026-10-29T19:00:00.000Z',
    );
    // timestamptz columns, such as tickets.created_at.
    expect(toUtcIsoString('2026-10-19T18:31:58.085686+00:00')).toBe(
      '2026-10-19T18:31:58.085Z',
    );
  });

  it('returns null for a missing or unreadable value', () => {
    for (const value of [null, undefined, '', 'not a date', 1761764400000]) {
      expect(parseDbTimestampMs(value)).toBeNull();
      expect(toUtcIsoString(value)).toBeNull();
      expect(parseDbTimestamp(value).getTime()).toBeNaN();
    }
  });

  it('parses a value without an offset into the UTC instant', () => {
    expect(parseDbTimestamp('2026-10-29T19:00:00').toISOString()).toBe(
      '2026-10-29T19:00:00.000Z',
    );
  });

  it('sends the start and end of an events row as UTC', () => {
    expect(
      withUtcEventTimes({
        id: 'event',
        title: 'Pat Todd & The Rankoutsiders',
        start_date_time: '2026-10-29T19:00:00',
        end_date_time: '2026-10-30T00:00:00',
      }),
    ).toEqual({
      id: 'event',
      title: 'Pat Todd & The Rankoutsiders',
      start_date_time: '2026-10-29T19:00:00.000Z',
      end_date_time: '2026-10-30T00:00:00.000Z',
    });
  });
});
