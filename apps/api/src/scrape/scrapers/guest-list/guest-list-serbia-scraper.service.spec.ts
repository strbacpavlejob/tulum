/**
 * Where GuestListSerbiaScraperService puts a venue. Its pages publish the
 * venue's point in their JSON-LD, which the scraper ignored. It went by the
 * Google Maps link alone and, when it couldn't read that, the venue got
 * Belgrade's centre (44.8125, 20.4612), stacking seven venues on one spot.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { Coordinates } from '../../../geocoder/coordinates';
import { GeocoderService } from '../../../geocoder/geocoder.service';
import { GuestListSerbiaScraperService } from './guest-list-serbia-scraper.service';

const BASE_URL = 'https://guestlist-serbia.com/';

interface PageVenue {
  name: string;
  address: string;
  geo?: [number, number];
  mapsHref?: string;
}

// The shape of a guestlist-serbia.com event page, 2026-10-24.
const eventPage = (title: string, venue: PageVenue) => `<!DOCTYPE html>
<html><head>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: title,
  startDate: '2026-10-31T23:00:00+01:00',
  location: {
    '@type': 'Place',
    name: venue.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      addressLocality: 'Belgrade',
      postalCode: '11000',
      addressCountry: 'RS',
    },
    ...(venue.geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: venue.geo[0],
        longitude: venue.geo[1],
      },
    }),
  },
})}</script>
</head><body>
<h1>${title}</h1>
${venue.mapsHref ? `<a href="${venue.mapsHref}"><p>${venue.address}</p></a>` : ''}
</body></html>`;

const TRADICIJA: PageVenue = {
  name: 'Tradicija',
  address: 'Tadeuša Košćuška 63, Belgrade',
  geo: [44.830528846765596, 20.455850339708338],
  mapsHref: 'https://maps.app.goo.gl/Vo6sdYuapKE6972Y6',
};
const GRADSKA_KAFANA: PageVenue = {
  name: 'Gradska Kafana',
  address: 'Dragana Jeftića 10, Belgrade',
  mapsHref: 'https://maps.app.goo.gl/YPgC9T66WHhAKZMv6',
};
const THE_BANK: PageVenue = {
  name: 'The Bank',
  address: 'Crnogorska 12, Belgrade',
  mapsHref: 'https://maps.app.goo.gl/LedcFszjJ2G6ao6m7',
};
const SIPAJ_NE_PITAJ: PageVenue = {
  name: 'Sipaj, Ne Pitaj',
  address: 'Bulevar vojvode Mišića 11, below Mostarska petlja',
  mapsHref:
    'https://www.google.com/maps/search/?api=1&amp;query=Kafana+Sipaj+ne+pitaj+Bulevar+vojvode+Mi%C5%A1i%C4%87a+11+Beograd',
};

const setup = (events: Record<string, [string, PageVenue]>) => {
  const pages = new Map<string, string>([
    [
      `${BASE_URL}?venue-type-2=Nightclub`,
      Object.keys(events)
        .map((slug) => `<a href="./events/${slug}">${slug}</a>`)
        .join('\n'),
    ],
    [`${BASE_URL}?venue-type-2=Tavern`, '<html></html>'],
    [`${BASE_URL}?venue-type-2=Restaurant`, '<html></html>'],
    ...Object.entries(events).map(
      ([slug, [title, venue]]): [string, string] => [
        `${BASE_URL}events/${slug}`,
        eventPage(title, venue),
      ],
    ),
  ]);

  const httpService = {
    get: jest.fn((url: string) => {
      const data = pages.get(url);
      if (data === undefined) throw new Error(`Unexpected request: ${url}`);
      return of({ data });
    }),
  };
  const geocoder = {
    extractCoordinates: jest
      .fn<(html: string) => Promise<Coordinates | null>>()
      .mockResolvedValue(null),
    geocodeVenueAddress: jest
      .fn<
        (address: string, countryCode?: string) => Promise<Coordinates | null>
      >()
      .mockResolvedValue(null),
  };
  const configService = { getOrThrow: () => 'host-user-id' };

  const scraper = new GuestListSerbiaScraperService(
    httpService as unknown as HttpService,
    geocoder as unknown as GeocoderService,
    configService as unknown as ConfigService,
  );
  // No Chrome in unit tests: the list page then comes over plain HTTP, the
  // scraper's own fallback.
  jest
    .spyOn(
      scraper as unknown as { getBrowser(): Promise<unknown> },
      'getBrowser',
    )
    .mockRejectedValue(new Error('no browser in unit tests'));

  return { scraper, geocoder };
};

const venuePoints = (
  venues: { name: string; latitude: number; longitude: number }[],
) => venues.map(({ name, latitude, longitude }) => [name, latitude, longitude]);

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GuestListSerbiaScraperService venue coordinates', () => {
  it("uses the point the page's JSON-LD gives, without asking Google or Nominatim", async () => {
    const { scraper, geocoder } = setup({
      'saturday-tradicija': ['To be announced', TRADICIJA],
    });

    const { venues, events } = await scraper.scrape();

    expect(venuePoints(venues)).toEqual([
      ['Tradicija', 44.830528846765596, 20.455850339708338],
    ]);
    expect(events.map((event) => event.title)).toEqual(['To be announced']);
    expect(geocoder.extractCoordinates).not.toHaveBeenCalled();
    expect(geocoder.geocodeVenueAddress).not.toHaveBeenCalled();
  });

  it('falls back to the maps link, then to the address on Nominatim', async () => {
    const { scraper, geocoder } = setup({
      'gradska-kafana-saturday': ['Nenad Blizanac', GRADSKA_KAFANA],
      'the-bank-saturday': ['Season X - Saturday', THE_BANK],
    });
    geocoder.extractCoordinates.mockImplementation((html) =>
      Promise.resolve(
        html.includes(GRADSKA_KAFANA.mapsHref!)
          ? { latitude: 44.8113363, longitude: 20.4391007 }
          : null,
      ),
    );
    geocoder.geocodeVenueAddress.mockResolvedValue({
      latitude: 44.8148059,
      longitude: 20.4516152,
    });

    const { venues, events } = await scraper.scrape();

    expect(venuePoints(venues)).toEqual([
      ['Gradska Kafana', 44.8113363, 20.4391007],
      ['The Bank', 44.8148059, 20.4516152],
    ]);
    expect(events).toHaveLength(2);
    expect(geocoder.geocodeVenueAddress).toHaveBeenCalledTimes(1);
    expect(geocoder.geocodeVenueAddress).toHaveBeenCalledWith(
      'Crnogorska 12, Belgrade',
      'RS',
    );
  });

  it("skips a venue nothing can locate instead of giving it the city centre, and doesn't look it up twice", async () => {
    const { scraper, geocoder } = setup({
      'saturday-sipaj-ne-pitaj': [
        'Bojana Jović & Nikola Trifić',
        SIPAJ_NE_PITAJ,
      ],
      'friday-sipaj-ne-pitaj': ['Friday Live', SIPAJ_NE_PITAJ],
      'saturday-tradicija': ['To be announced', TRADICIJA],
    });

    const { venues, events } = await scraper.scrape();

    expect(venuePoints(venues)).toEqual([
      ['Tradicija', 44.830528846765596, 20.455850339708338],
    ]);
    expect(events.map((event) => event.venue.name)).toEqual(['Tradicija']);
    expect(geocoder.extractCoordinates).toHaveBeenCalledTimes(1);
    expect(geocoder.geocodeVenueAddress).toHaveBeenCalledTimes(1);
    expect(geocoder.geocodeVenueAddress).toHaveBeenCalledWith(
      'Bulevar vojvode Mišića 11, below Mostarska petlja',
      'RS',
    );
  });

  it('locates a venue once for all its events', async () => {
    const { scraper, geocoder } = setup({
      'the-bank-saturday': ['Season X - Saturday', THE_BANK],
      'the-bank-friday': ['Season X - Friday', THE_BANK],
    });
    geocoder.extractCoordinates.mockResolvedValue({
      latitude: 44.8146909,
      longitude: 20.4516833,
    });

    const { venues, events } = await scraper.scrape();

    expect(venuePoints(venues)).toEqual([['The Bank', 44.8146909, 20.4516833]]);
    expect(events).toHaveLength(2);
    expect(geocoder.extractCoordinates).toHaveBeenCalledTimes(1);
    expect(geocoder.geocodeVenueAddress).not.toHaveBeenCalled();
  });

  it('does not take a 0,0 JSON-LD point', async () => {
    const { scraper, geocoder } = setup({
      'saturday-tradicija': ['To be announced', { ...TRADICIJA, geo: [0, 0] }],
    });
    geocoder.extractCoordinates.mockResolvedValue({
      latitude: 44.830467,
      longitude: 20.455928,
    });

    const { venues } = await scraper.scrape();

    expect(venuePoints(venues)).toEqual([['Tradicija', 44.830467, 20.455928]]);
  });
});
