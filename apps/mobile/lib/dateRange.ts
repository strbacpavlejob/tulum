import { addDays, endOfDay, startOfDay } from "date-fns";
import type { Filter } from "@/types/filter";

type DateRange = Filter["dateRange"];

export interface DateRangeBounds {
  from: Date | null;
  to: Date | null;
}

/** The filter's default range: today and the next 7 days. */
export function createDefaultDateRange(): DateRange {
  const today = new Date();
  return { start: today, end: addDays(today, 7) };
}

/**
 * The instants a date range covers: from the start of its first day to the
 * end of its last day, in local time. The calendar returns each day at noon
 * and the default range starts when the app loaded, so their own times would
 * cut both days short.
 */
export function getDateRangeBounds(
  range?: Partial<DateRange> | null,
): DateRangeBounds {
  return {
    from: range?.start ? startOfDay(range.start) : null,
    to: range?.end ? endOfDay(range.end) : null,
  };
}

/**
 * Whether an event that starts at `eventStart` is in the range: it starts on
 * one of the range's days. Once the range has begun, events that started
 * before it count too, so live events stay listed; the API lists only events
 * that haven't ended and applies the same rule.
 */
export function isInDateRange(
  eventStart: string | Date | null | undefined,
  { from, to }: DateRangeBounds,
  now: Date = new Date(),
): boolean {
  const start = eventStart ? new Date(eventStart) : null;
  if (!start || Number.isNaN(start.getTime())) return !from && !to;
  if (from && from > now && start < from) return false;
  if (to && start > to) return false;
  return true;
}
