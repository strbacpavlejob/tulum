import {
  addCalendarDays,
  calendarDateInZone,
  normalizeText,
  zonedTimeToUtc,
} from '../scrape/shared/scraper.helpers';

/*
 * The weekly Instagram posts' rules: which post goes out on which day, which
 * events it shows and its caption. No I/O, so the specs cover all of it.
 */

/** Posts are planned in Belgrade time: their days, weeks and event times. */
export const POST_TIME_ZONE = 'Europe/Belgrade';

export type EventGroup = 'bars' | 'clubs' | 'food' | 'culture';

/** A post shows one group's events, or with 'week' every group's. */
export type PostKind = 'week' | EventGroup;

export const POST_KINDS: readonly PostKind[] = [
  'week',
  'bars',
  'clubs',
  'food',
  'culture',
];

/** venues.venue_type, the venue_type_enum values. */
export type VenueType =
  | 'bar'
  | 'tavern'
  | 'club'
  | 'restaurant'
  | 'cafe'
  | 'event_venue';

/** The venue types each group shows; a group's cover shows its first. */
export const GROUP_VENUE_TYPES: Record<EventGroup, readonly VenueType[]> = {
  bars: ['bar', 'tavern'],
  clubs: ['club'],
  food: ['restaurant', 'cafe'],
  culture: ['event_venue'],
};

/** The order the week's post takes the groups in, one event at a time. */
export const GROUP_ORDER: readonly EventGroup[] = [
  'clubs',
  'bars',
  'culture',
  'food',
];

export const GROUP_LABELS: Record<EventGroup, string> = {
  bars: 'Bars & taverns',
  clubs: 'Clubs & nightlife',
  food: 'Restaurants & cafés',
  culture: 'Concerts & culture',
};

/** The groups' names on the week's cover, where four have to fit a row. */
export const GROUP_SHORT_LABELS: Record<EventGroup, string> = {
  bars: 'Bars',
  clubs: 'Clubs',
  food: 'Food',
  culture: 'Culture',
};

const GROUP_EMOJI: Record<EventGroup, string> = {
  bars: '🍸',
  clubs: '🪩',
  food: '🍽️',
  culture: '🎟️',
};

/**
 * Which post goes out on which Belgrade weekday, unless
 * INSTAGRAM_POSTS_SCHEDULE says otherwise. The scrapers run on Monday and
 * Thursday mornings and Monday's brings in most of the week's events, so the
 * week's post goes out on Monday evening; the clubs wait for Friday, when
 * Thursday's scrape has added the weekend's nights.
 */
export const DEFAULT_SCHEDULE =
  'mon:week,tue:culture,wed:food,thu:bars,fri:clubs';

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface PostSchedule {
  /** The post for each weekday, 0 (Sunday) to 6. */
  byWeekday: Map<number, PostKind>;
  /** Entries that are not "day:kind", left out. */
  invalid: string[];
}

export function isPostKind(value: unknown): value is PostKind {
  return (
    typeof value === 'string' &&
    (POST_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Reads a schedule such as "mon:week,fri:clubs". Unset means
 * DEFAULT_SCHEDULE; "off" or an empty value means no posts.
 */
export function parseSchedule(value: string | undefined): PostSchedule {
  const text = (value ?? DEFAULT_SCHEDULE).trim();
  const byWeekday = new Map<number, PostKind>();
  const invalid: string[] = [];
  if (text === '' || text.toLowerCase() === 'off') {
    return { byWeekday, invalid };
  }

  for (const entry of text.split(',')) {
    if (!entry.trim()) continue;
    const parts = entry.split(':').map((part) => part.trim().toLowerCase());
    const weekday = WEEKDAYS.indexOf(parts[0]);
    if (parts.length !== 2 || weekday === -1 || !isPostKind(parts[1])) {
      invalid.push(entry.trim());
      continue;
    }
    byWeekday.set(weekday, parts[1]);
  }
  return { byWeekday, invalid };
}

/*
 * Slides per post, cover and closing slide included, unless
 * INSTAGRAM_POSTS_MAX_SLIDES says otherwise (3 to 20). Meta's publishing
 * guide allows 20, but its error table still says a carousel takes at most
 * 10, so 10 until a post with more has gone through.
 */
export const DEFAULT_MAX_SLIDES = 10;

const MAX_SLIDES_LIMIT = 20;

/** The slides a post may have; its events are two fewer. */
export function maxSlides(value: string | undefined): number {
  const parsed = value?.trim() ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 3 && parsed <= MAX_SLIDES_LIMIT
    ? parsed
    : DEFAULT_MAX_SLIDES;
}

/* Fewer events than this, and the post doesn't go out. */
export const MIN_EVENTS_PER_POST = 3;

export interface PostWindow {
  /** The post's day, a Belgrade calendar date (YYYY-MM-DD). */
  date: string;
  /** That day's weekday, 0 (Sunday) to 6. */
  weekday: number;
  /** The week's last day, Sunday (YYYY-MM-DD). */
  lastDate: string;
  /** A post shows events that start from now… */
  from: Date;
  /** …until the week ends, Monday 00:00 in Belgrade. */
  until: Date;
}

/** The rest of the week a post made at `now` covers, Belgrade time. */
export function postWindow(now: Date): PostWindow {
  const date = calendarDateInZone(now, POST_TIME_ZONE);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  // Days to the next Monday; on a Monday, the Monday after.
  const daysLeft = (8 - weekday) % 7 || 7;
  const nextMonday = addCalendarDays(date, daysLeft);
  return {
    date,
    weekday,
    lastDate: addCalendarDays(nextMonday, -1),
    from: now,
    until: zonedTimeToUtc(nextMonday, '00:00', POST_TIME_ZONE),
  };
}

export interface PostEvent {
  id: string;
  title: string;
  /** When the event starts, ISO 8601. */
  startsAt: string;
  /** The event's picture, or its venue's, in the bucket. */
  pictureUrl: string;
  venueId: string;
  venueName: string;
  venueType: VenueType;
  group: EventGroup;
  /** The venue's Instagram username, tagged on its slide; null when unknown. */
  instagramHandle: string | null;
  /** Guests going (tickets). */
  guestCount: number;
}

/** The group a venue type belongs to. */
export function groupOfVenueType(venueType: VenueType): EventGroup {
  const group = GROUP_ORDER.find((g) =>
    GROUP_VENUE_TYPES[g].includes(venueType),
  );
  if (!group) throw new Error(`No post shows venue type ${venueType}`);
  return group;
}

/** Whether a venues.venue_type value is a type the posts show. */
export function isVenueType(value: unknown): value is VenueType {
  return (
    typeof value === 'string' &&
    GROUP_ORDER.some((group) =>
      (GROUP_VENUE_TYPES[group] as readonly string[]).includes(value),
    )
  );
}

/**
 * The events a post shows, at most maxEvents, in date order. Events more
 * guests are going to come first; among equals, ones on a day the post has
 * fewer events on, so that a post isn't all Thursday while nobody has joined
 * anything yet. A venue appears once, and so does a title: the same act is
 * often listed at several venues. The week's post takes the groups in turn,
 * so the bars, which have most of the week's events, don't fill it.
 */
export function pickEvents(
  events: readonly PostEvent[],
  kind: PostKind,
  maxEvents: number,
): PostEvent[] {
  const candidates = events.filter(
    (event) => kind === 'week' || event.group === kind,
  );
  const queues =
    kind === 'week'
      ? GROUP_ORDER.map((group) => candidates.filter((e) => e.group === group))
      : [candidates];
  const dayOf = new Map(
    candidates.map((event) => [
      event.id,
      calendarDateInZone(new Date(event.startsAt), POST_TIME_ZONE),
    ]),
  );

  const picked: PostEvent[] = [];
  const venues = new Set<string>();
  const titles = new Set<string>();
  const perDay = new Map<string | undefined, number>();
  const isNew = (event: PostEvent) =>
    !venues.has(event.venueId) && !titles.has(normalizeText(event.title));
  const rank = (a: PostEvent, b: PostEvent) =>
    b.guestCount - a.guestCount ||
    (perDay.get(dayOf.get(a.id)) ?? 0) - (perDay.get(dayOf.get(b.id)) ?? 0) ||
    byStart(a, b);

  let tookOne = true;
  while (picked.length < maxEvents && tookOne) {
    tookOne = false;
    for (const queue of queues) {
      if (picked.length >= maxEvents) break;
      const next = queue.filter(isNew).sort(rank)[0];
      if (!next) continue;
      queue.splice(queue.indexOf(next), 1);
      picked.push(next);
      venues.add(next.venueId);
      titles.add(normalizeText(next.title));
      const day = dayOf.get(next.id);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
      tookOne = true;
    }
  }
  return picked.sort(byStart);
}

/** Events in date order. */
export function byStart(a: PostEvent, b: PostEvent): number {
  return (
    Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id)
  );
}

/** An event in the history the Stories and the posts share. */
export interface PromotedEvent {
  eventId: string;
  title: string;
}

/**
 * The events neither a story nor a post has promoted: an event is promoted
 * once. Another event with a promoted one's title is left out too, as the
 * same act is often listed twice.
 */
export function withoutPromoted<T extends Pick<PostEvent, 'id' | 'title'>>(
  events: readonly T[],
  promoted: readonly PromotedEvent[],
): T[] {
  const ids = new Set(promoted.map((event) => event.eventId));
  const titles = new Set(
    promoted.map((event) => normalizeText(event.title)).filter(Boolean),
  );
  return events.filter(
    (event) => !ids.has(event.id) && !titles.has(normalizeText(event.title)),
  );
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: POST_TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: POST_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const CALENDAR_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

/** "Fri 4 Dec", the event's day in Belgrade. */
export function formatDay(startsAt: string): string {
  return DAY_FORMAT.format(new Date(startsAt));
}

/** "22:00", the event's start in Belgrade. */
export function formatTime(startsAt: string): string {
  return TIME_FORMAT.format(new Date(startsAt));
}

/** The days a post covers: "26 – 29 Nov", "30 Nov – 6 Dec" or "29 Nov". */
export function formatDateRange(window: PostWindow): string {
  const first = new Date(`${window.date}T12:00Z`);
  const last = CALENDAR_DATE_FORMAT.format(
    new Date(`${window.lastDate}T12:00Z`),
  );
  if (window.date === window.lastDate) return last;
  return window.date.slice(0, 7) === window.lastDate.slice(0, 7)
    ? `${first.getUTCDate()} – ${last}`
    : `${CALENDAR_DATE_FORMAT.format(first)} – ${last}`;
}

/**
 * Text for the slides. Emoji and flags are left out: the slides' font has
 * none, and they would show as empty boxes.
 */
export function slideText(value: string): string {
  return value
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|⃣/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Instagram refuses a caption over 2,200 characters, 30 hashtags or 20 @
 * tags. Titles' own @ and # are dropped, so the post's tags are the venues
 * and the list below. */
const MAX_CAPTION_LENGTH = 2_200;

const MAX_MENTIONS = 20;

const MAX_TITLE_LENGTH = 80;

const COMMON_HASHTAGS = [
  '#beograd',
  '#belgrade',
  '#belgradeevents',
  '#thingstodoinbelgrade',
  '#tulumapp',
];

const HASHTAGS: Record<PostKind, string[]> = {
  week: ['#belgradenightlife', '#beogradnocu'],
  bars: ['#belgradebars', '#kafana', '#beogradnocu'],
  clubs: ['#belgradenightlife', '#clubbing', '#beogradnocu'],
  food: ['#belgradefood', '#belgraderestaurants', '#belgradecafe'],
  culture: ['#belgradeculture', '#koncert', '#livemusic'],
};

const CAPTION_CLOSING =
  'Join an event on Tulum, check in when you get there and meet the people who are there too 👉 tulum-app.com';

/**
 * The post's caption: what it covers, a line per event with the venue's
 * Instagram tagged, how Tulum works, and hashtags.
 */
export function buildCaption(
  kind: PostKind,
  events: readonly PostEvent[],
  window: PostWindow,
): string {
  const range = formatDateRange(window);
  const heading =
    kind === 'week'
      ? `This week in Belgrade ✨ ${range}`
      : `${GROUP_LABELS[kind]} this week ${GROUP_EMOJI[kind]} ${range}`;

  let mentions = 0;
  const lines = events.map((event) => {
    const tagged = event.instagramHandle !== null && mentions < MAX_MENTIONS;
    if (tagged) mentions += 1;
    const venue = tagged
      ? `@${event.instagramHandle}`
      : captionText(event.venueName);
    return `${GROUP_EMOJI[event.group]} ${formatDay(event.startsAt)} · ${captionText(event.title)} at ${venue}`;
  });
  const hashtags = [...COMMON_HASHTAGS, ...HASHTAGS[kind]].join(' ');

  const caption = (eventLines: string[]) =>
    [heading, eventLines.join('\n'), CAPTION_CLOSING, hashtags].join('\n\n');
  // Event lines past the limit are left to the slides.
  while (lines.length > 0 && caption(lines).length > MAX_CAPTION_LENGTH) {
    lines.pop();
  }
  return caption(lines);
}

/* A title or venue name in the caption: on one line, without @ or #, and
 * at most MAX_TITLE_LENGTH characters. */
function captionText(value: string): string {
  const text = value.replace(/[@#]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > MAX_TITLE_LENGTH
    ? `${text.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : text;
}
