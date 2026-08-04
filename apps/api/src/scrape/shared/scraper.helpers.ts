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
