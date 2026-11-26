import {
  addCalendarDays,
  calendarDateInZone,
  normalizeText,
  zonedTimeToUtc,
} from '../scrape/shared/scraper.helpers';
import {
  byStart,
  GROUP_ORDER,
  POST_TIME_ZONE,
  PostEvent,
  slideText,
} from './instagram-post-rules';

/*
 * The Instagram Stories' rules: when they go out, which events they show and
 * what a story calls its event's day. No I/O, so the specs cover all of it.
 * Times are Belgrade's, like the weekly posts'.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * When the day's Stories go out, Belgrade time, unless
 * INSTAGRAM_STORIES_SCHEDULE says otherwise.
 */
export const DEFAULT_STORY_SCHEDULE = '10:00,15:00,18:00';

export interface StorySchedule {
  /** "HH:MM", in order. */
  times: string[];
  /** Entries that are not a time, left out. */
  invalid: string[];
}

/**
 * Reads a schedule such as "10:00,15:00,18:00". Unset means
 * DEFAULT_STORY_SCHEDULE; "off" or an empty value means no Stories.
 */
export function parseStorySchedule(value: string | undefined): StorySchedule {
  const text = (value ?? DEFAULT_STORY_SCHEDULE).trim();
  const times = new Set<string>();
  const invalid: string[] = [];
  if (text === '' || text.toLowerCase() === 'off') {
    return { times: [], invalid };
  }

  for (const entry of text.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
      invalid.push(trimmed);
      continue;
    }
    times.add(`${match[1].padStart(2, '0')}:${match[2]}`);
  }
  return { times: [...times].sort(), invalid };
}

/** How many events a run shows: from min to max, at random each run. */
export interface StoryEventRange {
  min: number;
  max: number;
}

/** Unless INSTAGRAM_STORIES_EVENTS says otherwise. */
export const DEFAULT_STORY_EVENTS: StoryEventRange = { min: 2, max: 3 };

/* A run of more would flood the account's Stories. */
const MAX_STORY_EVENTS = 10;

/** Reads INSTAGRAM_STORIES_EVENTS: "2-3" shows 2 or 3 events, "3" always 3. */
export function storyEventRange(value: string | undefined): StoryEventRange {
  const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(value ?? '');
  if (!match) return DEFAULT_STORY_EVENTS;
  const min = Number(match[1]);
  const max = match[2] === undefined ? min : Number(match[2]);
  return min >= 1 && min <= max && max <= MAX_STORY_EVENTS
    ? { min, max }
    : DEFAULT_STORY_EVENTS;
}

/** The number of events this run shows. */
export function storyCount(
  range: StoryEventRange,
  random: () => number,
): number {
  return range.min + randomIndex(range.max - range.min + 1, random);
}

/** Unless INSTAGRAM_STORIES_WINDOW_HOURS says otherwise. */
export const DEFAULT_STORY_WINDOW_HOURS = 48;

const STORY_WINDOW_HOURS_LIMITS = { min: 2, max: 7 * 24 };

/** Reads INSTAGRAM_STORIES_WINDOW_HOURS: how far ahead an event may start. */
export function storyWindowHours(value: string | undefined): number {
  const parsed = value?.trim() ? Number(value) : NaN;
  return Number.isInteger(parsed) &&
    parsed >= STORY_WINDOW_HOURS_LIMITS.min &&
    parsed <= STORY_WINDOW_HOURS_LIMITS.max
    ? parsed
    : DEFAULT_STORY_WINDOW_HOURS;
}

/* An event that starts within the hour is left out: its story would stay
 * up for a day after it began. */
export const MIN_LEAD_MINUTES = 60;

export interface StoryWindow {
  from: Date;
  until: Date;
}

/** When the events of a run at now may start. */
export function storyWindow(now: Date, windowHours: number): StoryWindow {
  return {
    from: new Date(now.getTime() + MIN_LEAD_MINUTES * MINUTE_MS),
    until: new Date(now.getTime() + windowHours * HOUR_MS),
  };
}

/* A slot's Stories may go out until this long after its time. The cron
 * looks every five minutes, so a failed run can be tried again meanwhile. */
export const SLOT_WINDOW_MINUTES = 45;

/** When a failed slot is tried again, in minutes after its time. */
export const RETRY_AFTER_MINUTES: readonly number[] = [10, 30];

export interface StorySlot {
  /** "2026-11-27T10:00": the slot's Belgrade date and time. */
  key: string;
  date: string;
  time: string;
  at: Date;
}

/**
 * The slot a run at now belongs to: the latest scheduled time that has
 * passed, if it passed less than SLOT_WINDOW_MINUTES ago.
 */
export function dueSlot(now: Date, times: readonly string[]): StorySlot | null {
  const today = calendarDateInZone(now, POST_TIME_ZONE);
  const passed = slotsOn([addCalendarDays(today, -1), today], times).filter(
    (slot) => slot.at.getTime() <= now.getTime(),
  );
  const latest = passed.at(-1);
  return latest &&
    now.getTime() - latest.at.getTime() < SLOT_WINDOW_MINUTES * MINUTE_MS
    ? latest
    : null;
}

/** The first scheduled slot after now. */
export function nextSlot(
  now: Date,
  times: readonly string[],
): StorySlot | null {
  const today = calendarDateInZone(now, POST_TIME_ZONE);
  return (
    slotsOn([today, addCalendarDays(today, 1)], times).find(
      (slot) => slot.at.getTime() > now.getTime(),
    ) ?? null
  );
}

/**
 * When a slot that has failed `attempts` times may be tried again; null
 * once its tries are used up.
 */
export function retryAt(slot: StorySlot, attempts: number): Date | null {
  const minutes = RETRY_AFTER_MINUTES[attempts - 1];
  return minutes === undefined
    ? null
    : new Date(slot.at.getTime() + minutes * MINUTE_MS);
}

function slotsOn(dates: string[], times: readonly string[]): StorySlot[] {
  return dates
    .flatMap((date) =>
      times.map((time) => ({
        key: `${date}T${time}`,
        date,
        time,
        at: zonedTimeToUtc(date, time, POST_TIME_ZONE),
      })),
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Whether an event can have a story: its title has text once emoji go. */
export function hasStoryTitle(event: Pick<PostEvent, 'title'>): boolean {
  return slideText(event.title) !== '';
}

/**
 * Picks count events at random for a run's stories, as varied as they come:
 * never two at one venue or with one title, from a group the run hasn't
 * shown yet when there is one, and at a venue the last day's stories didn't
 * show when there is one. Each pick takes a group at random, then a venue
 * in it, then one of its events, so that the bars, which have most of the
 * events, don't fill the Stories. `picked` are the run's earlier picks;
 * only the new ones are returned, in date order.
 */
export function pickStoryEvents(
  events: readonly PostEvent[],
  count: number,
  {
    picked = [],
    recentVenueIds = new Set<string>(),
    random = Math.random,
  }: {
    picked?: readonly PostEvent[];
    recentVenueIds?: ReadonlySet<string>;
    random?: () => number;
  } = {},
): PostEvent[] {
  const chosen = [...picked];
  const picks: PostEvent[] = [];
  // In a fixed order, so that a given random sequence picks the same events.
  let pool = [...events].sort(byStart);

  while (chosen.length < count) {
    const venues = new Set(chosen.map((event) => event.venueId));
    const titles = new Set(chosen.map((event) => normalizeText(event.title)));
    const groups = new Set(chosen.map((event) => event.group));
    const open = pool.filter(
      (event) =>
        !venues.has(event.venueId) && !titles.has(normalizeText(event.title)),
    );
    const newGroup = (event: PostEvent) => !groups.has(event.group);
    const freshVenue = (event: PostEvent) => !recentVenueIds.has(event.venueId);
    const tier = [
      open.filter((event) => newGroup(event) && freshVenue(event)),
      open.filter(newGroup),
      open.filter(freshVenue),
      open,
    ].find((candidates) => candidates.length > 0);
    if (!tier) break;

    const group = randomOf(
      GROUP_ORDER.filter((g) => tier.some((event) => event.group === g)),
      random,
    );
    const inGroup = tier.filter((event) => event.group === group);
    const venueId = randomOf(
      [...new Set(inGroup.map((event) => event.venueId))],
      random,
    );
    const next = randomOf(
      inGroup.filter((event) => event.venueId === venueId),
      random,
    );
    chosen.push(next);
    picks.push(next);
    pool = pool.filter((event) => event !== next);
  }
  return picks.sort(byStart);
}

function randomOf<T>(items: readonly T[], random: () => number): T {
  return items[randomIndex(items.length, random)];
}

function randomIndex(length: number, random: () => number): number {
  return Math.min(length - 1, Math.floor(random() * length));
}

/* From this hour an event today is tonight's; one that starts in the small
 * hours of tomorrow is tonight's too (a club night that opens at 1:00). */
const EVENING_HOUR = 17;
const NIGHT_ENDS_HOUR = 5;

const HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: POST_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: POST_TIME_ZONE,
  weekday: 'long',
});

/** What a story calls its event's day: Tonight, Today, Tomorrow or Saturday. */
export function storyDay(startsAt: string, now: Date): string {
  const start = new Date(startsAt);
  const today = calendarDateInZone(now, POST_TIME_ZONE);
  const day = calendarDateInZone(start, POST_TIME_ZONE);
  const [hour, minute] = HOUR_FORMAT.format(start).split(':').map(Number);

  if (day === today) return hour >= EVENING_HOUR ? 'Tonight' : 'Today';
  const tomorrow = addCalendarDays(today, 1);
  // Midnight is what the sources store when they give no time.
  const smallHours = hour < NIGHT_ENDS_HOUR && (hour > 0 || minute > 0);
  if (day === tomorrow) return smallHours ? 'Tonight' : 'Tomorrow';
  return WEEKDAY_FORMAT.format(start);
}
