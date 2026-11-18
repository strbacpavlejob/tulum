import { ScrapedEvent, ScrapedVenue } from '../scrape/domain/scraper.interface';

/*
 * Pure helpers that turn scraped venues and events into database rows and
 * clean their text before ScrapedDataService saves them.
 */

export function toCamelCase<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => toCamelCase(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        toCamelCase(val),
      ]),
    ) as T;
  }

  return value as T;
}

export function mapScrapedVenueToDbRow(
  venue: ScrapedVenue,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    host_id: venue.hostId,
    name: venue.name,
    longitude: venue.longitude,
    latitude: venue.latitude,
    venue_type: venue.venueType,
    capacity: venue.capacity ?? undefined,
    address: venue.address ?? undefined,
    description: venue.description ?? undefined,
    picture_url: venue.pictureUrl ?? undefined,
    scraper: venue.scraper ?? undefined,
    min_age_male: venue.minAgeMale,
    min_age_female: venue.minAgeFemale,
  };
  return Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== undefined),
  );
}

export function mapScrapedEventToDbRow(
  event: ScrapedEvent,
  dbVenueId: string,
): Record<string, unknown> {
  return {
    venue_id: dbVenueId,
    title: sanitize(event.title),
    description: sanitize(event.description),
    start_date_time: event.startDateTime.toISOString(),
    end_date_time: event.endDateTime.toISOString(),
    tags: (event.tags?.map((t) => t.replace(/\u0000/g, '')) ?? []).slice(0, 3),
    picture_url: event.pictureUrl,
    status: event.status,
    scraper: event.scraper ?? null,
  };
}

function sanitize(value: string | null | undefined): string | null {
  if (value == null) return null;
  // Remove control chars that can break JSON transport/parsing in PostgREST.
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code <= 31 || code === 127);
    })
    .join('');
}

function sanitizeTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const sanitized = sanitize(value)?.trim() ?? '';
  return sanitized.length > 0 ? sanitized : null;
}

function toIsoString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function normalizeEventUpsertRow(
  event: Record<string, unknown>,
): Record<string, unknown> | null {
  const venueId =
    typeof event.venue_id === 'string' && isUuid(event.venue_id)
      ? event.venue_id
      : null;
  const title = sanitize(typeof event.title === 'string' ? event.title : null);
  const description = sanitize(
    typeof event.description === 'string' ? event.description : null,
  );
  const startDateTime = toIsoString(event.start_date_time);
  const endDateTime = toIsoString(event.end_date_time);

  if (!venueId || !title || !description || !startDateTime || !endDateTime) {
    return null;
  }

  const tagsInput = Array.isArray(event.tags) ? event.tags : [];
  const tags = tagsInput
    .map((tag) => sanitizeTag(tag))
    .filter((tag): tag is string => tag !== null)
    .slice(0, 3);

  return {
    ...event,
    venue_id: venueId,
    title,
    description,
    start_date_time: startDateTime,
    end_date_time: endDateTime,
    tags,
    picture_url:
      typeof event.picture_url === 'string'
        ? sanitize(event.picture_url)
        : null,
    scraper:
      typeof event.scraper === 'string'
        ? sanitize(event.scraper)
        : (event.scraper ?? null),
  };
}

export function normalizeVenueName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUuid(value: string | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
