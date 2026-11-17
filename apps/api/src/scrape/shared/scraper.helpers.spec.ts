import { describe, expect, it } from '@jest/globals';

import {
  addCalendarDays,
  calendarDateInZone,
  zonedTimeToUtc,
} from './scraper.helpers';

const BELGRADE = 'Europe/Belgrade';

describe('zonedTimeToUtc', () => {
  it('reads a Belgrade wall-clock time in winter (UTC+1) and summer (UTC+2)', () => {
    expect(zonedTimeToUtc('2026-11-21', '22:00', BELGRADE).toISOString()).toBe(
      '2026-11-21T21:00:00.000Z',
    );
    expect(zonedTimeToUtc('2026-07-10', '22:00', BELGRADE).toISOString()).toBe(
      '2026-07-10T20:00:00.000Z',
    );
  });

  it('uses the offset in force after a daylight-saving change that day', () => {
    // Clocks go forward at 02:00 on 29 March and back at 03:00 on 25 October.
    expect(zonedTimeToUtc('2026-03-29', '12:00', BELGRADE).toISOString()).toBe(
      '2026-03-29T10:00:00.000Z',
    );
    expect(zonedTimeToUtc('2026-10-25', '12:00', BELGRADE).toISOString()).toBe(
      '2026-10-25T11:00:00.000Z',
    );
  });

  it('throws for a date or time that does not exist', () => {
    expect(() => zonedTimeToUtc('2026-02-30', '20:00', BELGRADE)).toThrow();
    expect(() => zonedTimeToUtc('2026-11-21', '24:30', BELGRADE)).toThrow();
    expect(() => zonedTimeToUtc('21.11.2026', '20:00', BELGRADE)).toThrow();
  });
});

describe('calendar dates', () => {
  it('gives the date in the zone, not in UTC', () => {
    // 23:30 UTC on 21 November is already 22 November in Belgrade.
    expect(calendarDateInZone(new Date('2026-11-21T23:30:00Z'), BELGRADE)).toBe(
      '2026-11-22',
    );
  });

  it('moves a date across a month and a year', () => {
    expect(addCalendarDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
