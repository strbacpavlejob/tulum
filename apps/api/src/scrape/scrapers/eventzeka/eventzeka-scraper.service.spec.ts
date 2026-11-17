/**
 * EventZekaScraperService reads eventzeka.com's day pages, event pages, venue
 * directory and venue pages. The pages here are shaped like the site's
 * (2026-11-17): Next.js flight chunks whose payload holds the event documents
 * ("$undefined" for missing values, "$$" for a literal "$"), and JSON-LD for
 * the directory and the venues.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

import { ExistingData } from '../../domain/scraper.interface';
import { VenueTypeEnum } from '../../domain/scraper-venue.interfaces';
import {
  parseEventZekaCards,
  parseEventZekaDirectory,
  parseEventZekaEvent,
  parseEventZekaVenue,
} from './eventzeka-page.parser';
import { EventZekaScraperService } from './eventzeka-scraper.service';

const BASE_URL = 'https://eventzeka.com';
// 11:00 in Belgrade on Saturday 21 November 2026.
const NOW = new Date('2026-11-21T10:00:00Z');
const SAVED_VENUE_ID = '3f0d7c2e-91b4-4a6e-8f5d-2c7b9e1a4d60';

/** A page whose flight payload holds the documents, split over two pushes. */
const flightPage = (...documents: unknown[]) => {
  const payload = `1a:["$","div",null,{"children":${JSON.stringify(documents)}}]\n`;
  const half = Math.floor(payload.length / 2);
  const push = (chunk: string) =>
    `<script>self.__next_f.push([1,${JSON.stringify(chunk)}])</script>`;
  return `<!DOCTYPE html><html><body>${push(payload.slice(0, half))}${push(payload.slice(half))}</body></html>`;
};

const jsonLdPage = (...blocks: unknown[]) =>
  `<!DOCTYPE html><html><head>${blocks
    .map(
      (block) =>
        `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
    )
    .join('')}</head><body></body></html>`;

const directoryPage = (...venues: [id: string, name: string][]) =>
  jsonLdPage({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Belgrade venues: nightlife and culture guide',
    itemListElement: venues.map(([id, name], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      url: `${BASE_URL}/en/venues/${id}`,
    })),
  });

interface PageVenue {
  name: string;
  street?: string;
  geo?: [number, number];
  instagram?: string;
  category?: string;
}

const venuePage = (id: string, venue: PageVenue) =>
  jsonLdPage(
    {
      '@context': 'https://schema.org',
      '@id': `${BASE_URL}/venues/${id}#place`,
      '@type': 'LocalBusiness',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'RS',
        addressLocality: 'Belgrade',
        ...(venue.street && { streetAddress: venue.street }),
      },
      description: `${venue.name} is a ${venue.category ?? 'venue'} venue in Belgrade. Find upcoming events, location details, and the official Instagram profile on Event Zeka.`,
      ...(venue.geo && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: venue.geo[0],
          longitude: venue.geo[1],
        },
      }),
      name: venue.name,
      ...(venue.instagram && {
        sameAs: [`https://www.instagram.com/${venue.instagram}/`],
      }),
      url: `${BASE_URL}/en/venues/${id}`,
    },
    { '@type': 'BreadcrumbList', itemListElement: [] },
  );

type Doc = Record<string, unknown>;

const card = (id: string, overrides: Doc = {}): Doc => ({
  _id: id,
  title: 'Rokam',
  date: '2026-11-21',
  time: '23:00',
  timeStatus: 'confirmed',
  venue: 'HYPE Night Club',
  venueId: 'k17hype',
  venueCategory: 'venue',
  category: 'club',
  eventType: 'nightlife',
  artists: [],
  tags: ['Rock'],
  ticketPrice: '$undefined',
  eventTaxonomy: '$undefined',
  ...overrides,
});

/** The event's own page: no category, tags or taxonomy, plus the venue. */
const eventPage = (cardDoc: Doc, overrides: Doc = {}) => {
  const rest = { ...cardDoc };
  delete rest.category;
  delete rest.tags;
  delete rest.eventTaxonomy;

  return flightPage({
    ...rest,
    status: 'approved',
    sourceCaption: 'Rokam do jutra!\n\nUlaz <b>slobodan</b> &amp; dobra muzika',
    sourcePostedAt: '2026-11-15T12:00:00.000Z',
    instagramPostUrl: 'https://www.instagram.com/p/abc/',
    venueInstagramHandle: 'hypenightclub',
    venueLatitude: 44.8186,
    venueLongitude: 20.4568,
    venueAliases: [],
    ...overrides,
  });
};

const dayUrl = (day: string) =>
  `${BASE_URL}/en?month=${day.slice(0, 7)}&day=${day}`;
const eventUrl = (id: string) => `${BASE_URL}/en/events/${id}`;
const venueUrl = (id: string) => `${BASE_URL}/en/venues/${id}`;
const directoryUrl = (page: number) =>
  `${BASE_URL}/en/venues/directory${page > 1 ? `?page=${page}` : ''}`;

const setup = (
  pages: Map<string, string | Error>,
  { listAll = false }: { listAll?: boolean } = {},
) => {
  const requested: string[] = [];
  const httpService = {
    get: jest.fn((url: string) => {
      requested.push(url);
      const page = pages.get(url);
      if (page === undefined) throw new Error(`Unexpected request: ${url}`);
      if (page instanceof Error) throw page;
      return of({ data: page });
    }),
  };
  const configService = { getOrThrow: () => 'host-user-id' };

  const scraper = new EventZekaScraperService(
    httpService as unknown as HttpService,
    configService as unknown as ConfigService,
  );
  // No pause between requests in tests, and two days of listings.
  scraper.config.events.fetchDelay = 0;
  scraper.config.events.daysAhead = 2;
  scraper.config.venues.listAll = listAll;

  return { scraper, requested };
};

const saved = (...venues: [id: string, name: string][]): ExistingData =>
  ({
    venues: venues.map(([id, name]) => ({ id, name })),
  }) as unknown as ExistingData;

describe('EventZekaScraperService', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        'nextTick',
        'setImmediate',
        'setTimeout',
        'clearTimeout',
        'queueMicrotask',
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const rokam = card('j57rokam');
  const jazz = card('j57jazz', {
    title: 'Fusion Story Trio',
    time: '20:00–23:30',
    venue: 'Sinnerman Jazz Club',
    venueId: 'k17sinnerman',
    eventType: 'live music',
    category: 'live',
    tags: [],
    eventTaxonomy: { genres: ['jazz-blues'], primaryCategory: 'live' },
  });
  const theatre = card('j57theatre', {
    title: 'Udaji se muški',
    eventType: 'arts & culture',
    category: 'culture',
  });
  const noTime = card('j57notime', {
    title: 'Gitarisanje',
    time: '$undefined',
    timeStatus: 'unknown',
  });
  const sunday = card('j57sunday', {
    title: 'Sunday Session',
    date: '2026-11-22',
    time: '23:00–04:00',
    venue: 'Drugstore',
    venueId: 'k17drugstore',
  });

  const sitePages = () =>
    new Map<string, string | Error>([
      [dayUrl('2026-11-21'), flightPage(rokam, jazz, theatre, noTime)],
      // The next day lists Rokam again: one event, one page request.
      [dayUrl('2026-11-22'), flightPage(sunday, rokam)],
      [eventUrl('j57rokam'), eventPage(rokam)],
      [
        eventUrl('j57jazz'),
        eventPage(jazz, {
          venueInstagramHandle: '$undefined',
          venueLatitude: 44.8169,
          venueLongitude: 20.4633,
        }),
      ],
      [
        eventUrl('j57sunday'),
        eventPage(sunday, {
          venueInstagramHandle: 'drugstore_beograd',
          venueLatitude: 44.8292,
          venueLongitude: 20.4815,
          venueAliases: ['Club Drugstore', 'Drugstore Belgrade', 'Drugstore'],
        }),
      ],
      [
        venueUrl('k17hype'),
        venuePage('k17hype', {
          name: 'HYPE Night Club',
          street: 'Karađorđeva 46, Beograd',
          geo: [44.8186, 20.4568],
          instagram: 'hypenightclub',
          category: 'club',
        }),
      ],
      [
        venueUrl('k17sinnerman'),
        venuePage('k17sinnerman', {
          name: 'Sinnerman Jazz Club',
          geo: [44.8169, 20.4633],
        }),
      ],
      [
        venueUrl('k17drugstore'),
        venuePage('k17drugstore', {
          name: 'Drugstore',
          geo: [44.8191, 20.4891],
          instagram: 'clubdrugstore',
        }),
      ],
    ]);

  it('imports the configured types with an announced time, once each, from public pages only', async () => {
    const { scraper, requested } = setup(sitePages());

    const { events } = await scraper.scrape();

    expect(events.map((event) => event.title)).toEqual([
      'Rokam',
      'Fusion Story Trio',
      'Sunday Session',
    ]);
    expect(requested).toEqual([
      dayUrl('2026-11-21'),
      dayUrl('2026-11-22'),
      eventUrl('j57rokam'),
      eventUrl('j57jazz'),
      eventUrl('j57sunday'),
      venueUrl('k17hype'),
      venueUrl('k17sinnerman'),
      venueUrl('k17drugstore'),
    ]);
    expect(requested.some((url) => url.includes('/api/'))).toBe(false);
  });

  it('reads times in Belgrade and runs an end before the start into the next day', async () => {
    const { scraper } = setup(sitePages());

    const { events } = await scraper.scrape();
    const byTitle = new Map(events.map((event) => [event.title, event]));

    // 23:00 CET is 22:00 UTC; without an end it lasts defaultDurationHour (4).
    expect(byTitle.get('Rokam')?.startDateTime.toISOString()).toBe(
      '2026-11-21T22:00:00.000Z',
    );
    expect(byTitle.get('Rokam')?.endDateTime.toISOString()).toBe(
      '2026-11-22T02:00:00.000Z',
    );
    expect(byTitle.get('Fusion Story Trio')?.startDateTime.toISOString()).toBe(
      '2026-11-21T19:00:00.000Z',
    );
    expect(byTitle.get('Fusion Story Trio')?.endDateTime.toISOString()).toBe(
      '2026-11-21T22:30:00.000Z',
    );
    expect(byTitle.get('Sunday Session')?.endDateTime.toISOString()).toBe(
      '2026-11-23T03:00:00.000Z',
    );
  });

  it('builds one venue per Event Zeka venue, from its page and its events', async () => {
    const { scraper } = setup(sitePages());

    const { venues, events } = await scraper.scrape();

    expect(venues).toHaveLength(3);
    const hype = venues.find((venue) => venue.name === 'HYPE Night Club');
    expect(hype).toMatchObject({
      hostId: 'host-user-id',
      latitude: 44.8186,
      longitude: 20.4568,
      // The page's street address and category.
      address: 'Karađorđeva 46, Beograd',
      venueType: VenueTypeEnum.CLUB,
      scraper: 'eventzeka',
      aliases: [],
      venueContacts: {
        instagramHandle: 'hypenightclub',
        isInstagram: true,
        phoneNumber: '',
      },
    });
    expect(
      venues.find((venue) => venue.name === 'Sinnerman Jazz Club'),
    ).toMatchObject({
      address: 'Belgrade',
      venueType: VenueTypeEnum.EVENT_VENUE,
      venueContacts: null,
    });
    expect(venues.find((venue) => venue.name === 'Drugstore')).toMatchObject({
      // A club night at a generic "venue" makes it a club.
      venueType: VenueTypeEnum.CLUB,
      // The page's position and account win over the event's.
      latitude: 44.8191,
      venueContacts: { instagramHandle: 'clubdrugstore' },
      // The event's other names for it, without its own.
      aliases: ['Club Drugstore', 'Drugstore Belgrade'],
    });

    const rokamEvent = events.find((event) => event.title === 'Rokam');
    expect(rokamEvent).toMatchObject({
      venueId: 'k17hype',
      venue: hype,
      description: 'Rokam do jutra! Ulaz slobodan & dobra muzika',
      tags: ['Rock'],
      pictureUrl: `${BASE_URL}/api/discover/images/j57rokam`,
      scraper: 'eventzeka',
      status: 'active',
    });
    expect(
      events.find((event) => event.title === 'Fusion Story Trio')?.tags,
    ).toEqual(['jazz-blues']);
  });

  it("skips an event the page doesn't approve, gives no time for, or has no venue point for", async () => {
    const pages = sitePages();
    pages.set(eventUrl('j57rokam'), eventPage(rokam, { status: 'rejected' }));
    pages.set(
      eventUrl('j57jazz'),
      eventPage(jazz, { time: '$undefined', timeStatus: 'unknown' }),
    );
    pages.set(
      eventUrl('j57sunday'),
      eventPage(sunday, { venueLatitude: 0, venueLongitude: 0 }),
    );
    pages.set(
      venueUrl('k17drugstore'),
      venuePage('k17drugstore', { name: 'Drugstore' }),
    );
    const { scraper } = setup(pages);

    const result = await scraper.scrape();

    expect(result).toEqual({ venues: [], events: [] });
  });

  it('carries on past a day page or an event page that fails', async () => {
    const pages = sitePages();
    pages.set(dayUrl('2026-11-21'), new Error('socket hang up'));
    pages.set(eventUrl('j57sunday'), new Error('timeout'));
    const { scraper, requested } = setup(pages);

    const result = await scraper.scrape();

    expect(result.events.map((event) => event.title)).toEqual(['Rokam']);
    expect(requested).toContain(dayUrl('2026-11-22'));
  });

  describe('with listAll', () => {
    const directorySite = () =>
      new Map<string, string | Error>([
        [dayUrl('2026-11-21'), flightPage()],
        [dayUrl('2026-11-22'), flightPage()],
        [
          directoryUrl(1),
          directoryPage(['k17hype', 'HYPE Night Club'], ['k17after', 'After']),
        ],
        [directoryUrl(2), directoryPage(['k17ulus', 'ULUS'])],
        // Past the last page the site repeats it.
        [directoryUrl(3), directoryPage(['k17ulus', 'ULUS'])],
        [
          venueUrl('k17hype'),
          venuePage('k17hype', {
            name: 'HYPE Night Club',
            street: 'Karađorđeva 46, Beograd',
            geo: [44.8186, 20.4568],
            category: 'club',
          }),
        ],
        [
          venueUrl('k17after'),
          venuePage('k17after', {
            name: 'After',
            street: 'Makedonska 4, Beograd 11000',
            geo: [44.8152888, 20.4612578],
            instagram: 'after.belgrade',
            category: 'club',
          }),
        ],
        // No point on its page and no events: it can't be placed.
        [venueUrl('k17ulus'), venuePage('k17ulus', { name: 'ULUS' })],
      ]);

    it('imports every venue the directory lists, with no events needed', async () => {
      const { scraper, requested } = setup(directorySite(), {
        listAll: true,
      });

      const { venues, events } = await scraper.scrape();

      expect(events).toEqual([]);
      expect(
        venues.map((venue) => [venue.name, venue.address, venue.venueType]),
      ).toEqual([
        ['HYPE Night Club', 'Karađorđeva 46, Beograd', VenueTypeEnum.CLUB],
        ['After', 'Makedonska 4, Beograd 11000', VenueTypeEnum.CLUB],
      ]);
      expect(requested).toEqual([
        dayUrl('2026-11-21'),
        dayUrl('2026-11-22'),
        directoryUrl(1),
        directoryUrl(2),
        directoryUrl(3),
        venueUrl('k17hype'),
        venueUrl('k17after'),
        venueUrl('k17ulus'),
      ]);
    });

    it('leaves a venue the DB has by name or alias, and points its events at it', async () => {
      const pages = directorySite();
      pages.set(dayUrl('2026-11-21'), flightPage(rokam));
      pages.set(dayUrl('2026-11-22'), flightPage(sunday));
      pages.set(eventUrl('j57rokam'), eventPage(rokam));
      pages.set(
        eventUrl('j57sunday'),
        eventPage(sunday, { venueAliases: ['Club Drugstore'] }),
      );
      const { scraper, requested } = setup(pages, { listAll: true });

      const { venues, events } = await scraper.scrape(
        saved(
          [SAVED_VENUE_ID, 'Hype Night Club'],
          ['8a1e5f0b-6c3d-4b2a-9e7f-1d0c4b3a2e19', 'CLUB DRUGSTORE'],
        ),
      );

      expect(requested).not.toContain(venueUrl('k17hype'));
      expect(requested).not.toContain(venueUrl('k17drugstore'));
      expect(venues.map((venue) => venue.name)).toEqual(['After']);
      expect(events.map((event) => [event.title, event.venueId])).toEqual([
        ['Rokam', SAVED_VENUE_ID],
        ['Sunday Session', '8a1e5f0b-6c3d-4b2a-9e7f-1d0c4b3a2e19'],
      ]);
      // The event still carries what its page says about the venue.
      expect(events[0].venue).toMatchObject({
        name: 'HYPE Night Club',
        latitude: 44.8186,
      });
    });
  });
});

describe('eventzeka.com page parsing', () => {
  it('turns "$undefined" into nothing and "$$" into a literal "$"', () => {
    const [parsed] = parseEventZekaCards(
      flightPage(
        card('j57cheap', { title: '$$5 shots', ticketPrice: '$undefined' }),
      ),
    );

    expect(parsed.title).toBe('$5 shots');
    expect(parsed.ticketPrice).toBeUndefined();
    expect(parsed.eventTaxonomy).toBeUndefined();
  });

  it('skips documents that are not events', () => {
    const cards = parseEventZekaCards(
      flightPage(
        { _id: 'k17venue', name: 'Some venue' },
        card('j57ok'),
        card('j57nodate', { date: 'soon' }),
      ),
    );

    expect(cards.map((parsed) => parsed._id)).toEqual(['j57ok']);
  });

  it("merges the event's copies on its page, the first value winning", () => {
    const page = flightPage(
      card('j57dup', { venueLatitude: 44.8, venueLongitude: 20.4 }),
      card('j57dup', {
        title: 'A later copy',
        venueInstagramHandle: 'later',
        venueAliases: ['Klub X'],
      }),
    );

    expect(parseEventZekaEvent(page, 'j57dup')).toMatchObject({
      title: 'Rokam',
      venueLatitude: 44.8,
      venueInstagramHandle: 'later',
      venueAliases: ['Klub X'],
    });
    expect(parseEventZekaEvent(page, 'j57other')).toBeNull();
  });

  it('reads the venues a directory page lists', () => {
    expect(
      parseEventZekaDirectory(
        directoryPage(['k17a', '20/44'], ['k17b', 'Ananasa tri']),
      ),
    ).toEqual([
      { id: 'k17a', name: '20/44' },
      { id: 'k17b', name: 'Ananasa tri' },
    ]);
  });

  it("reads a venue's address, point, Instagram account and category from its page", () => {
    const page = venuePage('k17after', {
      name: 'After',
      street: 'Makedonska 4, Beograd 11000',
      geo: [44.8152888, 20.4612578],
      instagram: 'After.Belgrade',
      category: 'club',
    });

    expect(parseEventZekaVenue(page, 'k17after')).toEqual({
      id: 'k17after',
      name: 'After',
      streetAddress: 'Makedonska 4, Beograd 11000',
      latitude: 44.8152888,
      longitude: 20.4612578,
      instagramHandle: 'after.belgrade',
      category: 'club',
    });
    expect(parseEventZekaVenue(page, 'k17other')).toBeNull();
  });
});
