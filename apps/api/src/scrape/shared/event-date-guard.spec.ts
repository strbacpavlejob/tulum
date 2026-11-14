import { describe, expect, it } from '@jest/globals';
import { isPlausibleEventStart, MAX_DAYS_AFTER_POST } from './event-date-guard';

const POSTED = '2026-04-30T12:00:00.000Z';
const daysAfterPost = (days: number) =>
  new Date(Date.parse(POSTED) + days * 24 * 60 * 60 * 1000);

describe('isPlausibleEventStart (BUG-041)', () => {
  it('accepts a night from the day it is posted up to 60 days later', () => {
    expect(isPlausibleEventStart(daysAfterPost(0), POSTED)).toBe(true);
    expect(isPlausibleEventStart(daysAfterPost(25), POSTED)).toBe(true);
    expect(
      isPlausibleEventStart(daysAfterPost(MAX_DAYS_AFTER_POST), POSTED),
    ).toBe(true);
  });

  it('accepts a start up to a day before the post, which can go up that night', () => {
    expect(isPlausibleEventStart(daysAfterPost(-0.5), POSTED)).toBe(true);
    expect(isPlausibleEventStart(daysAfterPost(-2), POSTED)).toBe(false);
  });

  it('refuses a date months or years after the post', () => {
    expect(
      isPlausibleEventStart(daysAfterPost(MAX_DAYS_AFTER_POST + 1), POSTED),
    ).toBe(false);
    // "25.4" in a post from 30 April, rolled into the next year.
    expect(isPlausibleEventStart('2027-04-25T20:00:00.000Z', POSTED)).toBe(
      false,
    );
    expect(isPlausibleEventStart('2029-08-19T20:00:00.000Z', POSTED)).toBe(
      false,
    );
  });

  it('measures from now without a post time, and refuses a missing or broken start', () => {
    const now = new Date('2026-11-14T12:00:00.000Z');
    expect(isPlausibleEventStart('2026-11-20T20:00:00.000Z', null, now)).toBe(
      true,
    );
    expect(
      isPlausibleEventStart('2027-11-20T20:00:00.000Z', undefined, now),
    ).toBe(false);
    expect(isPlausibleEventStart(null, POSTED)).toBe(false);
    expect(isPlausibleEventStart('soon', POSTED)).toBe(false);
  });
});
