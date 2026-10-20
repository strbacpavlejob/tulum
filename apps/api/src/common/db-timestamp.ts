// events.start_date_time and end_date_time are `timestamp without time zone`
// columns that hold UTC: everything that writes them sends toISOString()
// values, and Postgres drops the "Z". supabase-js returns them without an
// offset (2026-10-29T19:00:00), which JavaScript parses as local time. The
// other timestamp columns are timestamptz and come back with an offset.
const EXPLICIT_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/i;

/** Milliseconds since the epoch; a value without an offset is read as UTC. */
export function parseDbTimestampMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value) return null;
  const iso = EXPLICIT_OFFSET.test(value) ? value : `${value}Z`;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * The timestamp as ISO-8601 UTC (2026-10-29T19:00:00.000Z). Responses use
 * this so every client reads the same instant, whatever its time zone.
 */
export function toUtcIsoString(value: unknown): string | null {
  const ms = parseDbTimestampMs(value);
  return ms === null ? null : new Date(ms).toISOString();
}
