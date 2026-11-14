const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long after the post announcing it an event may start. Venues announce
 * nights weeks ahead, not months: a later date is a misread one, such as a
 * "May 30" read as 2029 (BUG-041).
 */
export const MAX_DAYS_AFTER_POST = 60;
/** An event may start a little before its post, which can go up that night. */
const MAX_HOURS_BEFORE_POST = 24;

function toTime(value: Date | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Whether an event read from a post can start when it says: no earlier than
 * a day before the post, and no later than MAX_DAYS_AFTER_POST after it.
 * Without the post's time, now stands in for it.
 */
export function isPlausibleEventStart(
  start: Date | string | null | undefined,
  postedAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const startMs = toTime(start);
  if (startMs === null) return false;
  const referenceMs = toTime(postedAt) ?? now.getTime();
  return (
    startMs >= referenceMs - MAX_HOURS_BEFORE_POST * 60 * 60 * 1000 &&
    startMs <= referenceMs + MAX_DAYS_AFTER_POST * DAY_MS
  );
}
