import {
  EventZekaCard,
  EventZekaEvent,
  EventZekaListedVenue,
  EventZekaVenue,
} from '../../interfaces/eventzeka-event.interface';

/*
 * eventzeka.com is a Next.js site. Each page carries its React Server
 * Components payload in self.__next_f.push([1, "…"]) scripts, where the
 * event documents appear as JSON objects that start with their "_id".
 */

const FLIGHT_CHUNK = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The page's payload: its pushed string chunks, decoded and joined. */
export function nextFlightPayload(html: string): string {
  let payload = '';

  for (const match of html.matchAll(FLIGHT_CHUNK)) {
    try {
      payload += JSON.parse(match[1]) as string;
    } catch {
      // Not a plain string literal.
    }
  }

  return payload;
}

/** The index of the brace that closes the object opening at start, or -1. */
function closingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

/** Every JSON object in the payload that starts with {"_id":"<idPrefix>. */
function documents(payload: string, idPrefix = ''): Record<string, unknown>[] {
  const marker = `{"_id":"${idPrefix}`;
  const found: Record<string, unknown>[] = [];

  for (
    let start = payload.indexOf(marker);
    start >= 0;
    start = payload.indexOf(marker, start + marker.length)
  ) {
    const end = closingBrace(payload, start);
    if (end < 0) continue;

    try {
      found.push(
        JSON.parse(payload.slice(start, end + 1)) as Record<string, unknown>,
      );
    } catch {
      // Not plain JSON.
    }
  }

  return found;
}

/**
 * A payload value as plain data. "$undefined" and the payload's references
 * ("$L2c", "$2f") become undefined, and "$$" stands for a literal "$".
 */
function plain(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('$$')) return value.slice(1);
    return value.startsWith('$') ? undefined : value;
  }

  if (Array.isArray(value)) {
    return value.map(plain).filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, plain(item)])
        .filter(([, item]) => item !== undefined),
    );
  }

  return value;
}

const text = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value : undefined;

const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const texts = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

/** A card from a document already made plain, or null when it isn't one. */
function toCard(data: Record<string, unknown>): EventZekaCard | null {
  const id = text(data._id);
  const title = text(data.title);
  const date = text(data.date);
  const venue = text(data.venue);
  const venueId = text(data.venueId);

  if (
    !id ||
    !title ||
    !date ||
    !DATE_PATTERN.test(date) ||
    !venue ||
    !venueId
  ) {
    return null;
  }

  const taxonomy =
    data.eventTaxonomy && typeof data.eventTaxonomy === 'object'
      ? (data.eventTaxonomy as Record<string, unknown>)
      : undefined;

  return {
    _id: id,
    title,
    date,
    time: text(data.time),
    timeStatus: text(data.timeStatus),
    venue,
    venueId,
    venueCategory: text(data.venueCategory),
    category: text(data.category),
    eventType: text(data.eventType),
    artists: texts(data.artists),
    tags: texts(data.tags),
    ticketPrice: text(data.ticketPrice),
    eventTaxonomy: taxonomy && {
      categories: texts(taxonomy.categories),
      formats: texts(taxonomy.formats),
      genres: texts(taxonomy.genres),
      primaryCategory: text(taxonomy.primaryCategory),
    },
  };
}

/** The event cards on a day page, once each. */
export function parseEventZekaCards(html: string): EventZekaCard[] {
  const cards = new Map<string, EventZekaCard>();

  for (const document of documents(nextFlightPayload(html))) {
    const card = toCard(plain(document) as Record<string, unknown>);
    if (card && !cards.has(card._id)) cards.set(card._id, card);
  }

  return [...cards.values()];
}

/**
 * The event on its own page, with every field the page's documents for it
 * carry, or null when the page has none.
 */
export function parseEventZekaEvent(
  html: string,
  id: string,
): EventZekaEvent | null {
  // The page may carry the event more than once; the first value of each
  // field wins, and a shorter copy only fills what's missing.
  const data: Record<string, unknown> = {};
  for (const document of documents(nextFlightPayload(html), id)) {
    if (document._id !== id) continue;
    for (const [key, value] of Object.entries(
      plain(document) as Record<string, unknown>,
    )) {
      if (!(key in data)) data[key] = value;
    }
  }

  const card = toCard(data);
  if (!card) return null;

  return {
    ...card,
    status: text(data.status),
    sourceCaption: text(data.sourceCaption),
    sourcePostedAt: text(data.sourcePostedAt),
    instagramPostUrl: text(data.instagramPostUrl),
    venueLatitude: number(data.venueLatitude),
    venueLongitude: number(data.venueLongitude),
    venueInstagramHandle: text(data.venueInstagramHandle),
    venueAliases: texts(data.venueAliases),
  };
}

/*
 * Venue pages and the venue directory describe venues in JSON-LD: an
 * ItemList of the directory's page of venues, and a LocalBusiness for one
 * venue.
 */

function jsonLd(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];

  for (const match of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const parsed: unknown = JSON.parse(match[1]);
      for (const block of Array.isArray(parsed) ? parsed : [parsed]) {
        if (block && typeof block === 'object') {
          blocks.push(block as Record<string, unknown>);
        }
      }
    } catch {
      // Malformed JSON-LD.
    }
  }

  return blocks;
}

const VENUE_ID_IN_URL = /\/venues\/([0-9a-z]+)(?:[/?#]|$)/;

/** The venues one directory page lists, in its order. */
export function parseEventZekaDirectory(html: string): EventZekaListedVenue[] {
  const venues: EventZekaListedVenue[] = [];

  for (const block of jsonLd(html)) {
    if (block['@type'] !== 'ItemList') continue;
    if (!Array.isArray(block.itemListElement)) continue;

    for (const item of block.itemListElement as unknown[]) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const name = text(entry.name);
      const id = VENUE_ID_IN_URL.exec(text(entry.url) ?? '')?.[1];
      if (name && id) venues.push({ id, name });
    }
  }

  return venues;
}

/** The Instagram account a sameAs link names, e.g. "akademija28". */
function instagramHandle(sameAs: unknown): string | undefined {
  for (const link of Array.isArray(sameAs) ? sameAs : [sameAs]) {
    const handle =
      typeof link === 'string'
        ? /instagram\.com\/([A-Za-z0-9._]+)/i.exec(link)?.[1]
        : undefined;
    if (handle) return handle.toLowerCase();
  }

  return undefined;
}

/**
 * The venue on its own page, or null when the page doesn't describe it. Its
 * category is in the description the site writes for it: "After is a club
 * venue in Belgrade."
 */
export function parseEventZekaVenue(
  html: string,
  id: string,
): EventZekaVenue | null {
  for (const block of jsonLd(html)) {
    const ref = `${text(block['@id']) ?? ''} ${text(block.url) ?? ''}`;
    const name = text(block.name);
    if (!name || !ref.includes(`/venues/${id}`)) continue;

    const address =
      block.address && typeof block.address === 'object'
        ? (block.address as Record<string, unknown>)
        : undefined;
    const geo =
      block.geo && typeof block.geo === 'object'
        ? (block.geo as Record<string, unknown>)
        : undefined;

    return {
      id,
      name,
      streetAddress: text(address?.streetAddress),
      latitude: number(geo?.latitude),
      longitude: number(geo?.longitude),
      instagramHandle: instagramHandle(block.sameAs),
      category: /\bis an? (.+?) venue in\b/.exec(
        text(block.description) ?? '',
      )?.[1],
    };
  }

  return null;
}
