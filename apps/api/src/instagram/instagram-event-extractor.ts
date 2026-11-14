import * as chrono from 'chrono-node';
import { isValid, addYears, addHours, subMonths } from 'date-fns';
import { isPlausibleEventStart } from '../scrape/shared/event-date-guard';

export interface ExtractedEventData {
  title: string | null;
  venue: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  tags: string[];
  confidence: {
    title: number;
    venue: number;
    date: number;
  };
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const SERBIAN_DATE_MAP: Record<string, string> = {
  ponedeljak: 'monday',
  utorak: 'tuesday',
  sreda: 'wednesday',
  cetvrtak: 'thursday',
  četvrtak: 'thursday',
  petak: 'friday',
  subota: 'saturday',
  nedelja: 'sunday',
  danas: 'today',
  sutra: 'tomorrow',
  veceras: 'tonight',
  večeras: 'tonight',
};

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
}

function getCleanLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map((line) =>
      line
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

function normalizeSerbianDates(text: string): string {
  let normalized = text.toLowerCase();
  for (const [sr, en] of Object.entries(SERBIAN_DATE_MAP)) {
    normalized = normalized.replace(new RegExp(`\\b${sr}\\b`, 'gi'), en);
  }
  return normalized;
}

function isGoodTitleCandidate(line: string): boolean {
  if (line.length < 6 || line.length > 90) return false;
  if (line.startsWith('#')) return false;
  if (/📍|📞|info|reservation|rezervacije/i.test(line)) return false;
  if (/\+?\d[\d\s]{6,}/.test(line)) return false;
  const mostlyDate =
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|ponedeljak|utorak|sreda|cetvrtak|četvrtak|petak|subota|nedelja)\b/i.test(
      line,
    ) && /\d{1,2}/.test(line);
  if (mostlyDate) return false;
  return true;
}

function extractTitle(text: string): {
  value: string | null;
  confidence: number;
} {
  const lines = getCleanLines(text);

  if (lines[0] && isGoodTitleCandidate(lines[0])) {
    return {
      value: lines[0].replace(/[.!?]+$/, '').trim(),
      confidence: 0.9,
    };
  }

  const candidate = lines.find(isGoodTitleCandidate);
  return {
    value: candidate ? candidate.replace(/[.!?]+$/, '').trim() : null,
    confidence: candidate ? 0.65 : 0,
  };
}

function extractVenue(text: string): {
  value: string | null;
  confidence: number;
} {
  const locationMatch = text.match(/(?:📍|location:|venue:|at)\s*(.+)/i);
  if (!locationMatch) return { value: null, confidence: 0 };

  const venue = locationMatch[1]
    .split('\n')[0]
    .replace(/[#📞].*$/, '')
    .trim();

  return { value: venue || null, confidence: venue ? 0.95 : 0 };
}

/**
 * A day and month without a year, in the year around the post. A date that
 * falls more than half a year before the post is next year's (a December
 * post about 5.1). One shortly before it is left in the past, where the
 * date check drops it: rolling it a year forward made "25.4" in a post from
 * 30 April into next April (BUG-041).
 */
function dateNearPost(month: number, day: number, postedAt: Date): Date {
  const date = new Date(postedAt.getFullYear(), month, day);
  return date < subMonths(postedAt, 6) ? addYears(date, 1) : date;
}

function extractExplicitDate(text: string, postedAt: Date): Date | null {
  const dayMonthText = text.match(
    /\b(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\b/i,
  );
  if (dayMonthText) {
    const day = Number(dayMonthText[1]);
    const month = MONTH_MAP[dayMonthText[2].toLowerCase()];
    return dateNearPost(month, day, postedAt);
  }

  const numericDate = text.match(/\b(\d{1,2})[./-](\d{1,2})\b/);
  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]) - 1;
    return dateNearPost(month, day, postedAt);
  }

  return null;
}

/**
 * The date the caption announces, read relative to when it was posted, or
 * null when it can't be read or isn't an upcoming night near the post.
 */
function extractDate(
  text: string,
  postedAt: Date,
): { value: Date | null; confidence: number } {
  const explicitDate = extractExplicitDate(text, postedAt);
  if (explicitDate && isValid(explicitDate)) {
    return isPlausibleEventStart(explicitDate, postedAt)
      ? { value: explicitDate, confidence: 0.9 }
      : { value: null, confidence: 0 };
  }

  const parsed = chrono.parseDate(normalizeSerbianDates(text), postedAt, {
    forwardDate: true,
  });
  if (parsed && isValid(parsed) && isPlausibleEventStart(parsed, postedAt)) {
    return { value: parsed, confidence: 0.7 };
  }

  return { value: null, confidence: 0 };
}

function extractTags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g) ?? [];
  return matches.map((tag) => tag.slice(1).toLowerCase());
}

/**
 * The event a post's caption announces. Dates are read relative to postedAt,
 * when the post went up; without it, now.
 */
export function extractEventData(
  caption: string,
  postedAt: Date = new Date(),
): ExtractedEventData {
  const title = extractTitle(caption);
  const venue = extractVenue(caption);
  const date = extractDate(caption, postedAt);
  const tags = extractTags(caption);

  const startDateTime = date.value ? date.value.toISOString() : null;
  const endDateTime = date.value ? addHours(date.value, 5).toISOString() : null;

  return {
    title: title.value,
    venue: venue.value,
    startDateTime,
    endDateTime,
    tags: tags.slice(0, 3),
    confidence: {
      title: title.confidence,
      venue: venue.confidence,
      date: date.confidence,
    },
  };
}
