import { isAxiosError } from 'axios';
import { addHours, isValid, parseISO } from 'date-fns';

import { VenueTypeMapping } from '../domain/scraper-config';
import { VenueTypeEnum } from '../domain/scraper-venue.interfaces';

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (details: RetryDetails) => void;
}

export interface RetryDetails {
  error: unknown;
  attempt: number;
  retries: number;
  waitMs: number;
}

export interface EventDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Removes HTML tags, decodes common HTML entities,
 * normalizes whitespace and returns plain text.
 */
export function sanitizeScrapedText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pauses execution for the specified number of milliseconds.
 */
export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Executes an asynchronous operation with exponential retry backoff.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    delayMs = 0,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    onRetry,
  } = options;

  if (retries < 1) {
    throw new Error('Retry count must be at least 1');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const isFinalAttempt = attempt === retries;

      if (isFinalAttempt || !shouldRetry(error)) {
        throw error;
      }

      const waitMs = delayMs * backoffMultiplier ** (attempt - 1);

      onRetry?.({
        error,
        attempt,
        retries,
        waitMs,
      });

      await sleep(waitMs);
    }
  }

  throw new Error('Retry operation ended unexpectedly');
}

/**
 * Extracts an HTTP status code from an Axios error.
 */
export function getHttpStatus(error: unknown): number | undefined {
  if (!isAxiosError(error)) {
    return undefined;
  }

  return error.response?.status;
}

/**
 * Determines whether an HTTP request should be retried.
 *
 * Network errors and server errors are retryable.
 * Client errors such as 400, 401 and 404 are not retryable.
 */
export function isRetryableHttpError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  return status === undefined || status >= 500;
}

/**
 * Creates a venue type map from scraper configuration mappings.
 *
 * String keys are used because JavaScript object keys are always
 * internally represented as strings.
 */
export function buildVenueTypeMap(
  mappings: VenueTypeMapping[],
): Map<string, VenueTypeEnum> {
  return new Map(
    mappings.map((mapping) => [String(mapping.queryValue), mapping.venueType]),
  );
}

/**
 * Parses an external timestamp and creates an event date range.
 */
export function createEventDateRange(
  startDateValue: string | number | Date,
  durationHours: number,
): EventDateRange {
  const startDate = parseScrapedDate(startDateValue);

  return {
    startDate,
    endDate: addHours(startDate, durationHours),
  };
}

/**
 * Converts an external scraper date value into a valid Date.
 */
export function parseScrapedDate(value: string | number | Date): Date {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    date = parseISO(value);
  }

  if (!isValid(date)) {
    throw new Error(`Invalid scraped date: ${String(value)}`);
  }

  return date;
}

export function sanitizeString(value: string | undefined): string {
  return value ? value.split('\u0000').join('').trim() : '';
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What a time zone's clock reads at an instant, as numbers. */
function zonedClock(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

/** The calendar date, YYYY-MM-DD, in a time zone at an instant. */
export function calendarDateInZone(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedClock(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** A YYYY-MM-DD date moved by a number of calendar days. */
export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/**
 * The instant a wall-clock date and time happen in a time zone, e.g.
 * ("2026-11-21", "22:00", "Europe/Belgrade") is 2026-11-21T21:00:00Z, and in
 * July 20:00Z. Throws for a date or time that doesn't exist.
 */
export function zonedTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) {
    throw new Error(`Invalid local date or time: ${date} ${time}`);
  }

  const [year, month, day] = dateMatch.slice(1).map(Number);
  const [hour, minute] = timeMatch.slice(1).map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wallClockAsUtc);
  if (
    hour > 23 ||
    minute > 59 ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid local date or time: ${date} ${time}`);
  }

  // The zone's offset is what its clock reads minus the instant. A second
  // pass settles times next to a daylight-saving change.
  const offsetAt = (instant: number) => {
    const clock = zonedClock(new Date(instant), timeZone);
    return (
      Date.UTC(
        clock.year,
        clock.month - 1,
        clock.day,
        clock.hour,
        clock.minute,
        clock.second,
      ) - instant
    );
  };
  const firstGuess = wallClockAsUtc - offsetAt(wallClockAsUtc);
  return new Date(wallClockAsUtc - offsetAt(firstGuess));
}
