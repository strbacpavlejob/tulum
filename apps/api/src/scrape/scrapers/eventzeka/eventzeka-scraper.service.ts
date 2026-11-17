import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addHours } from 'date-fns';
import { firstValueFrom } from 'rxjs';

import { Coordinates, toCoordinates } from '../../../geocoder/coordinates';
import { GeocoderService } from '../../../geocoder/geocoder.service';
import {
  ImageStoragePolicy,
  SCRAPER_CONFIGS,
  ScraperConfig,
  ScraperSource,
} from '../../domain/scraper-config';
import {
  ExistingData,
  ScrapedEvent,
  ScrapedVenue,
  Scraper,
  ScraperResult,
} from '../../domain/scraper.interface';
import { VenueTypeEnum } from '../../domain/scraper-venue.interfaces';
import {
  EventZekaCard,
  EventZekaEvent,
  EventZekaListedVenue,
  EventZekaVenue,
} from '../../interfaces/eventzeka-event.interface';
import {
  addCalendarDays,
  buildVenueTypeMap,
  calendarDateInZone,
  getHttpStatus,
  isRetryableHttpError,
  normalizeText,
  sanitizeScrapedText,
  sanitizeString,
  sleep,
  withRetry,
  zonedTimeToUtc,
} from '../../shared/scraper.helpers';
import { ScraperLogs } from '../../shared/scraper-logs';
import {
  parseEventZekaCards,
  parseEventZekaDirectory,
  parseEventZekaEvent,
  parseEventZekaVenue,
} from './eventzeka-page.parser';

const TIME_ZONE = 'Europe/Belgrade';
const PAGE_TIMEOUT_MS = 30_000;
const USER_AGENT = 'TulumBot/1.0 (+https://tulum-app.com)';
/** "21:00", or "21:00–02:00" with an en dash or a hyphen. */
const TIME_PATTERN = /^(\d{1,2}:\d{2})(?:\s*[–-]\s*(\d{1,2}:\d{2}))?$/;
/** The directory had 45 pages of 12 venues in November 2026. */
const MAX_DIRECTORY_PAGES = 200;
const MAX_DIRECTORY_FAILURES = 3;
/**
 * The site answers 500 for minutes at a time now and then. A failed request
 * is tried again after 3 fetchDelays and then 6, and a venue page that still
 * fails is read once more at the end, 30 fetchDelays after the others.
 */
const RETRY_DELAY_FETCH_DELAYS = 3;
const SECOND_READ_PAUSE_FETCH_DELAYS = 30;
/**
 * Words in a normalized venue name that say what kind of place it is, the
 * first match winning. Names are padded with spaces, so these match whole
 * words.
 */
const VENUE_TYPE_NAME_WORDS: [RegExp, VenueTypeEnum][] = [
  // A jazz or blues club is a bar with a stage, not a nightclub.
  [/ (jazz|blues) (club|klub|bar) /, VenueTypeEnum.BAR],
  [/ (club|klub|nightclub|disco|diskoteka) /, VenueTypeEnum.CLUB],
  [/ (kafana|kafane) /, VenueTypeEnum.TAVERN],
  [/ (bar|pub|pab|pivnica|pivara|pivo|speakeasy) /, VenueTypeEnum.BAR],
  [
    / (restoran|restaurant|bistro|trattoria|pizzeria) /,
    VenueTypeEnum.RESTAURANT,
  ],
  [/ (cafe|caffe|kafe|kafic|coffee) /, VenueTypeEnum.CAFE],
];

interface EventTimes {
  startDate: Date;
  endDate: Date;
}

/** What is known about a venue, from its page and its events. */
interface VenueDetails {
  name: string;
  streetAddress?: string;
  instagramHandle?: string;
  aliases: string[];
}

/**
 * Events and venues from eventzeka.com, a Belgrade calendar read from venues'
 * Instagram posts. A day page lists that day's events; each event's own page
 * adds the venue's position and Instagram account and the post's caption.
 * The venue directory lists every venue, whose own page gives its street
 * address, position, Instagram account and category; a venue with an
 * address but no position is placed by geocoding the address. Only those
 * public pages are read: robots.txt disallows /api/.
 */
@Injectable()
export class EventZekaScraperService implements Scraper<
  [venue: VenueDetails, venueType: VenueTypeEnum, coordinates: Coordinates],
  [event: EventZekaEvent, venueId: string, venue: ScrapedVenue]
> {
  readonly config: ScraperConfig = SCRAPER_CONFIGS[ScraperSource.EVENTZEKA];

  private readonly logs = new ScraperLogs(
    EventZekaScraperService.name,
    this.config.source,
  );

  private lastRequestAt = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly geocoder: GeocoderService,
    private readonly configService: ConfigService,
  ) {
    const baseConfig = SCRAPER_CONFIGS[ScraperSource.EVENTZEKA];

    this.config = {
      ...baseConfig,
      events: { ...baseConfig.events },
      venues: {
        ...baseConfig.venues,
        defaultHostId: this.configService.getOrThrow<string>(
          'DEFAULT_VENUE_HOST_ID',
        ),
      },
    };
  }

  mapVenue(
    venue: VenueDetails,
    venueType: VenueTypeEnum,
    coordinates: Coordinates,
  ): ScrapedVenue {
    const now = new Date();
    const name = sanitizeString(venue.name);
    const instagramHandle = venue.instagramHandle?.trim() || null;

    return {
      hostId: this.config.venues.defaultHostId ?? 'DEFAULT_VENUE_HOST_ID',
      venueType,
      name,
      aliases: [
        ...new Set(
          venue.aliases
            .map((alias) => sanitizeString(alias))
            .filter((alias) => alias && alias !== name),
        ),
      ],
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      // The site has a street address for some venues only.
      address: venue.streetAddress
        ? sanitizeString(venue.streetAddress)
        : 'Belgrade',
      description: null,
      capacity: this.config.venues.defaultCapacity,
      pictureUrl: null,
      scraper: this.config.source,
      // The Instagram account is what ties the venue to one another source
      // already saved, whatever its name there (DuplicateCheckerService).
      venueContacts: instagramHandle
        ? {
            phoneNumber: '',
            isViber: false,
            isPhone: false,
            isSms: false,
            isWhatsapp: false,
            instagramHandle,
            isInstagram: true,
            createdAt: now,
            updatedAt: now,
          }
        : null,
      requiresReservation: false,
      minAgeMale: this.config.venues.defaultAgeRestriction?.male ?? 0,
      minAgeFemale: this.config.venues.defaultAgeRestriction?.female ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  mapEvent(
    event: EventZekaEvent,
    venueId: string,
    venue: ScrapedVenue,
  ): ScrapedEvent {
    const times = this.eventTimes(event);
    if (!times) {
      throw new Error(`Event ${event._id} has no announced start time`);
    }

    const now = new Date();

    return {
      venue,
      venueId,
      title: sanitizeString(event.title),
      description: this.describe(event),
      startDateTime: times.startDate,
      endDateTime: times.endDate,
      tags: this.tagsOf(event),
      pictureUrl:
        this.config.events.imagePolicy === ImageStoragePolicy.KEEP_EMPTY
          ? null
          : // The event's share image, which robots.txt allows.
            `${this.config.baseUrl}/api/discover/images/${event._id}`,
      status: this.config.events.defaultStatus,
      scraper: this.config.source,
      createdAt: now,
      updatedAt: now,
    };
  }

  async scrape(existingData?: ExistingData): Promise<ScraperResult> {
    const events = await this.fetchEvents();
    const listed = this.config.venues.listAll
      ? await this.fetchDirectory()
      : [];
    const savedIdsByName = this.savedVenueIdsByName(existingData);

    // Every listed venue, then any venue that only an event names.
    const names = new Map(listed.map((venue) => [venue.id, venue.name]));
    const eventAt = new Map<string, EventZekaEvent>();
    for (const event of events) {
      if (!eventAt.has(event.venueId)) eventAt.set(event.venueId, event);
      if (!names.has(event.venueId)) names.set(event.venueId, event.venue);
    }

    const savedIds = new Map<string, string>();
    const unsaved = new Map<string, string>();

    for (const [id, name] of names) {
      const savedId = this.findSavedVenue(savedIdsByName, [
        name,
        ...(eventAt.get(id)?.venueAliases ?? []),
      ]);

      // Venue names are unique in the DB, so a venue saved under one of
      // these names is this one: its events point at it, its page isn't
      // read again, and it isn't saved over.
      if (savedId) savedIds.set(id, savedId);
      else unsaved.set(id, name);
    }

    const pages = await this.fetchVenues(unsaved);
    const venuesById = new Map<string, ScrapedVenue>();
    let withoutPoint = 0;

    for (const [id, name] of unsaved) {
      const venue = await this.toVenue(
        name,
        pages.get(id) ?? null,
        eventAt.get(id),
      );

      if (venue) {
        venuesById.set(id, venue);
      } else {
        withoutPoint += 1;
        this.logs.debug(`Skipping "${name}": no position`);
      }
    }

    const scrapedEvents: ScrapedEvent[] = [];

    for (const event of events) {
      const venue =
        venuesById.get(event.venueId) ??
        (await this.toVenue(event.venue, null, event));

      // Without a point the venue can't be saved, and a made-up one would
      // put it in the wrong place on the map.
      if (!venue) {
        this.logs.warning(
          `Skipping "${event.title}": no position for ${event.venue}`,
        );
        continue;
      }

      scrapedEvents.push(
        this.mapEvent(
          event,
          savedIds.get(event.venueId) ?? event.venueId,
          venue,
        ),
      );
    }

    const venues = [...venuesById.values()];
    this.logs.info(
      `Venues: ${names.size} listed, ${savedIds.size} already saved by ` +
        `name, ${venues.length} read, ${withoutPoint} without a position`,
    );
    this.logs.transformationCompleted(venues, scrapedEvents);
    this.logs.scrapeCompleted(venues.length, scrapedEvents.length);

    return { venues, events: scrapedEvents };
  }

  /**
   * The events on each day page from today in Belgrade on, once each, that
   * are of the configured types and have an announced start time. Without
   * one the site shows "Time not announced": such events come in on a later
   * scrape, once it is.
   */
  private async fetchCards(): Promise<EventZekaCard[]> {
    const today = calendarDateInZone(new Date(), TIME_ZONE);
    const days = this.config.events.daysAhead ?? 7;
    const includeTypes = this.config.events.includeTypes?.map((type) =>
      type.toLowerCase(),
    );

    const seen = new Set<string>();
    const kept: EventZekaCard[] = [];
    let otherTypes = 0;
    let withoutTime = 0;

    for (let offset = 0; offset < days; offset += 1) {
      const day = addCalendarDays(today, offset);
      const url = `${this.config.baseUrl}/en?month=${day.slice(0, 7)}&day=${day}`;

      let html: string;
      try {
        html = await this.fetchHtml(url);
      } catch (error) {
        this.logs.warning(
          `Skipping the events of ${day}: ${(error as Error).message}`,
        );
        continue;
      }

      for (const card of parseEventZekaCards(html)) {
        if (seen.has(card._id)) continue;
        seen.add(card._id);

        if (
          includeTypes &&
          !includeTypes.includes(card.eventType?.toLowerCase() ?? '')
        ) {
          otherTypes += 1;
          continue;
        }

        if (!this.eventTimes(card)) {
          withoutTime += 1;
          continue;
        }

        kept.push(card);
      }
    }

    this.logs.info(
      `Listed ${seen.size} events over ${days} days: kept ${kept.length}, ` +
        `${otherTypes} of other types, ${withoutTime} without a start time`,
    );

    return kept;
  }

  /** The kept events from their own pages: approved, with a start time. */
  private async fetchEvents(): Promise<EventZekaEvent[]> {
    const events: EventZekaEvent[] = [];

    for (const card of await this.fetchCards()) {
      const event = await this.fetchEvent(card);
      if (!event) continue;

      if (event.status && event.status !== 'approved') {
        this.logs.debug(`Skipping "${event.title}": ${event.status}`);
        continue;
      }

      // The listing had a start time, but the event's page decides.
      if (!this.eventTimes(event)) continue;

      events.push(event);
    }

    return events;
  }

  /** The event from its own page, or null when the page fails or lacks it. */
  private async fetchEvent(
    card: EventZekaCard,
  ): Promise<EventZekaEvent | null> {
    const url = `${this.config.baseUrl}/en/events/${encodeURIComponent(card._id)}`;

    try {
      const event = parseEventZekaEvent(await this.fetchHtml(url), card._id);

      if (!event) {
        this.logs.warning(`Skipping "${card.title}": no event data on ${url}`);
        return null;
      }

      // The page doesn't repeat the listing's category, tags or taxonomy.
      return {
        ...event,
        category: event.category ?? card.category,
        venueCategory: event.venueCategory ?? card.venueCategory,
        tags: event.tags ?? card.tags,
        eventTaxonomy: event.eventTaxonomy ?? card.eventTaxonomy,
      };
    } catch (error) {
      this.logs.warning(
        `Skipping "${card.title}": ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Every venue in the site's directory, page by page, until a page adds
   * none: past the last page the site repeats it.
   */
  private async fetchDirectory(): Promise<EventZekaListedVenue[]> {
    const venues = new Map<string, EventZekaListedVenue>();
    let failures = 0;

    for (let page = 1; page <= MAX_DIRECTORY_PAGES; page += 1) {
      const url =
        `${this.config.baseUrl}/en/venues/directory` +
        (page > 1 ? `?page=${page}` : '');

      let listed: EventZekaListedVenue[];
      try {
        listed = parseEventZekaDirectory(await this.fetchHtml(url));
      } catch (error) {
        this.logs.warning(
          `Skipping venue directory page ${page}: ${(error as Error).message}`,
        );
        if (++failures >= MAX_DIRECTORY_FAILURES) break;
        continue;
      }

      const before = venues.size;
      for (const venue of listed) {
        if (!venues.has(venue.id)) venues.set(venue.id, venue);
      }
      if (venues.size === before) break;
    }

    this.logs.info(`The venue directory lists ${venues.size} venues`);

    return [...venues.values()];
  }

  /**
   * These venues' pages by id, without the ones that fail. A page that
   * fails with a server or network error is read once more after the
   * others, when a burst of errors has likely passed.
   */
  private async fetchVenues(
    names: Map<string, string>,
  ): Promise<Map<string, EventZekaVenue | null>> {
    const pages = new Map<string, EventZekaVenue | null>();
    const failed: [id: string, name: string][] = [];

    for (const [id, name] of names) {
      try {
        pages.set(id, await this.fetchVenue(id, name));
      } catch (error) {
        if (isRetryableHttpError(error)) failed.push([id, name]);
        this.logs.warning(
          `Can't read the page of "${name}": ${(error as Error).message}`,
        );
      }
    }

    if (failed.length === 0) return pages;

    await sleep(
      (this.config.events.fetchDelay ?? 0) * SECOND_READ_PAUSE_FETCH_DELAYS,
    );

    for (const [id, name] of failed) {
      try {
        pages.set(id, await this.fetchVenue(id, name));
      } catch (error) {
        this.logs.warning(
          `Skipping the page of "${name}": ${(error as Error).message}`,
        );
      }
    }

    const read = failed.filter(([id]) => pages.has(id)).length;
    this.logs.info(
      `Read ${read} of ${failed.length} failed venue pages on a second try`,
    );

    return pages;
  }

  /** The venue from its own page, or null when the page lacks it. */
  private async fetchVenue(
    id: string,
    name: string,
  ): Promise<EventZekaVenue | null> {
    const url = `${this.config.baseUrl}/en/venues/${encodeURIComponent(id)}`;
    const venue = parseEventZekaVenue(await this.fetchHtml(url), id);
    if (!venue) this.logs.warning(`No data for "${name}" on ${url}`);
    return venue;
  }

  /**
   * The venue from its page, filled in from one of its events: the page
   * gives the street address and category, the event the venue's other
   * names. Its point is the page's, else the event's, else where Nominatim
   * puts its street address; null without one, never the city centre.
   */
  private async toVenue(
    name: string,
    page: EventZekaVenue | null,
    event?: EventZekaEvent,
  ): Promise<ScrapedVenue | null> {
    const coordinates =
      toCoordinates(page?.latitude, page?.longitude) ??
      toCoordinates(event?.venueLatitude, event?.venueLongitude) ??
      (page?.streetAddress
        ? await this.geocoder.geocodeVenueAddress(
            this.addressQuery(page.streetAddress),
            'RS',
          )
        : null);
    if (!coordinates) return null;

    return this.mapVenue(
      {
        name,
        streetAddress: page?.streetAddress,
        instagramHandle: page?.instagramHandle ?? event?.venueInstagramHandle,
        aliases: event?.venueAliases ?? [],
      },
      this.venueTypeOf(name, page?.category, event),
      coordinates,
    );
  }

  /**
   * A street address as a Nominatim query: without notes in brackets
   * ("Karađorđeva 50 (Hotel Bristol)"), and in Belgrade unless a place
   * follows a comma ("Zmaj Jovina 2, Novi Sad 21000").
   */
  private addressQuery(streetAddress: string): string {
    const address = streetAddress.replace(/\s*\([^)]*\)/g, '').trim();
    return address.includes(',') ? address : `${address}, Beograd`;
  }

  /** The DB's venues by normalized name; names are unique there. */
  private savedVenueIdsByName(
    existingData?: ExistingData,
  ): Map<string, string> {
    const ids = new Map<string, string>();

    for (const venue of existingData?.venues ?? []) {
      const name = normalizeText(venue.name ?? '');
      if (name && venue.id && !ids.has(name)) ids.set(name, venue.id);
    }

    return ids;
  }

  private findSavedVenue(
    savedIdsByName: Map<string, string>,
    names: string[],
  ): string | undefined {
    for (const name of names) {
      const id = savedIdsByName.get(normalizeText(name));
      if (id) return id;
    }

    return undefined;
  }

  /**
   * When the event starts and ends: its announced time on its date in
   * Belgrade. An end at or before the start is the next day (23:00–04:00);
   * without an end the event lasts defaultDurationHour. Null when the time
   * isn't announced.
   */
  private eventTimes(event: EventZekaCard): EventTimes | null {
    if (event.timeStatus !== 'confirmed' || !event.time) return null;

    const match = TIME_PATTERN.exec(event.time.trim());
    if (!match) return null;

    try {
      const startDate = zonedTimeToUtc(event.date, match[1], TIME_ZONE);

      if (!match[2]) {
        return {
          startDate,
          endDate: addHours(startDate, this.config.events.defaultDurationHour),
        };
      }

      let endDate = zonedTimeToUtc(event.date, match[2], TIME_ZONE);
      if (endDate <= startDate) {
        endDate = zonedTimeToUtc(
          addCalendarDays(event.date, 1),
          match[2],
          TIME_ZONE,
        );
      }

      return { startDate, endDate };
    } catch {
      return null;
    }
  }

  /**
   * The venue's own category (from its page, else its events'). The site
   * calls most venues just "venue": then a club night at it makes it a club,
   * and otherwise its name may say what it is ("Jazz bar Sinatra").
   */
  private venueTypeOf(
    name: string,
    pageCategory: string | undefined,
    event?: EventZekaCard,
  ): VenueTypeEnum {
    const types = buildVenueTypeMap(this.config.venues.venueTypeMapping);
    const generic = types.get('venue') ?? VenueTypeEnum.EVENT_VENUE;

    const own = (pageCategory ?? event?.venueCategory)?.toLowerCase();
    const ownType = own && own !== 'venue' ? types.get(own) : undefined;
    if (ownType) return ownType;

    const eventCategory = event?.category?.toLowerCase();
    const eventType = eventCategory ? types.get(eventCategory) : undefined;
    if (eventType && eventType !== generic) return eventType;

    const words = ` ${normalizeText(name)} `;
    const named = VENUE_TYPE_NAME_WORDS.find(([pattern]) =>
      pattern.test(words),
    );

    return named?.[1] ?? generic;
  }

  /** The announcement's caption, or who plays and the price without one. */
  private describe(event: EventZekaEvent): string {
    const caption = sanitizeScrapedText(event.sourceCaption);
    if (caption) return caption;

    const artists = (event.artists ?? [])
      .map((artist) => sanitizeString(artist))
      .filter(Boolean);

    return [
      artists.length ? `${artists.join(', ')}.` : '',
      event.ticketPrice ? `${sanitizeString(event.ticketPrice)}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  /** The listing's tags, then its genres: three at most, once each. */
  private tagsOf(event: EventZekaCard): string[] {
    const seen = new Set<string>();

    return [...(event.tags ?? []), ...(event.eventTaxonomy?.genres ?? [])]
      .map((tag) => sanitizeString(tag))
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (tag.length < 2 || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }

  /** A page as text, fetchDelay after the last request, retrying 5xx. */
  private fetchHtml(url: string): Promise<string> {
    return withRetry(
      async () => {
        await this.throttle();

        const response = await firstValueFrom(
          this.httpService.get<string>(url, {
            responseType: 'text',
            timeout: PAGE_TIMEOUT_MS,
            headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
          }),
        );

        if (typeof response.data !== 'string') {
          throw new Error(`Expected an HTML page from ${url}`);
        }

        return response.data;
      },
      {
        retries: 3,
        delayMs:
          (this.config.events.fetchDelay ?? 0) * RETRY_DELAY_FETCH_DELAYS,
        shouldRetry: isRetryableHttpError,
        onRetry: ({ error, attempt, retries, waitMs }) =>
          this.logs.requestRetry({
            attempt,
            retries,
            waitMs,
            status: getHttpStatus(error),
          }),
      },
    );
  }

  /** Keeps fetchDelay between requests, to stay light on the site. */
  private async throttle(): Promise<void> {
    const wait =
      this.lastRequestAt + (this.config.events.fetchDelay ?? 0) - Date.now();
    if (wait > 0) await sleep(wait);
    this.lastRequestAt = Date.now();
  }
}
