/**
 * The geocoder never makes up a point. It used to return Belgrade's centre
 * (44.8125, 20.4612) for any page whose maps link it couldn't read, so seven
 * GuestList venues were stacked on that spot on the map.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { toCoordinates } from './coordinates';
import { GeocoderService } from './geocoder.service';

// URLs as Google returned them for GuestList's venue links, 2026-10-24.
const GRADSKA_KAFANA_PLACE =
  'https://www.google.com/maps/place/Gradska+Kafana+Beograd/@44.8181541,20.4518584,15z/data=!4m7!3m6!1s0x475a7ab6c9b3a499:0x54dca42552cdde68!8m2!3d44.8113363!4d20.4391007!15sCipHcmFkc2thIEthZmFuYQ';
const TRADICIJA_SHORT_LINK_TARGET =
  'https://www.google.com/maps/search/44.830467,+20.455928?entry=tts&g_ep=EgoyMDI2MDQyMi4wIPu8ASoASAFQAw%3D%3D';
const SIPAJ_NE_PITAJ_SEARCH_HREF =
  'https://www.google.com/maps/search/?api=1&amp;query=Kafana+Sipaj+ne+pitaj+Bulevar+vojvode+Mi%C5%A1i%C4%87a+11+Beograd';

const pageWithLink = (href: string) =>
  `<html><body><a href="${href}" target="_blank"><p>Bulevar vojvode Mišića 11</p></a></body></html>`;

const nominatimReplies = (body: unknown, status = 200) =>
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

const nominatimResult = (lat: string, lon: string, placeRank: number) => ({
  lat,
  lon,
  display_name: 'Nominatim result',
  place_rank: placeRank,
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('GeocoderService.extractCoordinatesFromUrl', () => {
  const service = new GeocoderService();

  it("takes a place's pin, not where the map is centred", () => {
    expect(service.extractCoordinatesFromUrl(GRADSKA_KAFANA_PLACE)).toEqual({
      latitude: 44.8113363,
      longitude: 20.4391007,
    });
  });

  it.each([
    ['a maps.app.goo.gl redirect', TRADICIJA_SHORT_LINK_TARGET],
    [
      'an encoded search',
      'https://www.google.com/maps/search/44.830467%2C%2B20.455928',
    ],
    ['a query parameter', 'https://maps.google.com/?q=44.830467,20.455928'],
    [
      "a consent page's continue URL",
      'https://consent.google.com/ml?continue=https://www.google.com/maps/search/44.830467,%2B20.455928%3Fentry%3Dtts&gl=RS',
    ],
  ])('reads the coordinates searched for in %s', (_, url) => {
    expect(service.extractCoordinatesFromUrl(url)).toEqual({
      latitude: 44.830467,
      longitude: 20.455928,
    });
  });

  it('takes the centre of a plain map link', () => {
    expect(
      service.extractCoordinatesFromUrl(
        'https://www.google.com/maps/@44.8137936,20.4513368,17z',
      ),
    ).toEqual({ latitude: 44.8137936, longitude: 20.4513368 });
  });

  it.each([
    [
      "a text search's map centre",
      'https://www.google.com/maps/search/Club+Hype+Beograd/@44.8125,20.4612,13z',
    ],
    ['an unresolved text search', SIPAJ_NE_PITAJ_SEARCH_HREF],
    ['a short link', 'https://maps.app.goo.gl/Vo6sdYuapKE6972Y6'],
    ['the 0,0 placeholder', 'https://www.google.com/maps/@0,0,2z'],
  ])('returns null for %s', (_, url) => {
    expect(service.extractCoordinatesFromUrl(url)).toBeNull();
  });
});

describe('GeocoderService.extractCoordinates', () => {
  const setup = (resolvedUrl: string | null) => {
    const service = new GeocoderService();
    const resolveMapsUrl = jest
      .spyOn(service, 'resolveMapsUrl')
      .mockResolvedValue(resolvedUrl);

    return { service, resolveMapsUrl };
  };

  it('returns null, not the city centre, when the page has no maps link', async () => {
    const { service, resolveMapsUrl } = setup(null);

    await expect(
      service.extractCoordinates(
        '<html><body><p>Bulevar vojvode Mišića 11</p></body></html>',
      ),
    ).resolves.toBeNull();
    expect(resolveMapsUrl).not.toHaveBeenCalled();
  });

  it('returns null when the maps link resolves to nothing it can read', async () => {
    const { service, resolveMapsUrl } = setup(null);

    await expect(
      service.extractCoordinates(pageWithLink(SIPAJ_NE_PITAJ_SEARCH_HREF)),
    ).resolves.toBeNull();
    // The href's &amp; is decoded, or Google never gets the query.
    expect(resolveMapsUrl).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Kafana+Sipaj+ne+pitaj+Bulevar+vojvode+Mi%C5%A1i%C4%87a+11+Beograd',
    );
  });

  it("returns null when a search resolves to its results' map", async () => {
    const { service } = setup(
      'https://www.google.com/maps/search/Kafana+Sipaj+ne+pitaj/@44.8125,20.4612,13z',
    );

    await expect(
      service.extractCoordinates(pageWithLink(SIPAJ_NE_PITAJ_SEARCH_HREF)),
    ).resolves.toBeNull();
  });

  it('follows a short link to the coordinates it redirects to', async () => {
    const { service, resolveMapsUrl } = setup(TRADICIJA_SHORT_LINK_TARGET);

    await expect(
      service.extractCoordinates(
        pageWithLink('https://maps.app.goo.gl/Vo6sdYuapKE6972Y6'),
      ),
    ).resolves.toEqual({ latitude: 44.830467, longitude: 20.455928 });
    expect(resolveMapsUrl).toHaveBeenCalledWith(
      'https://maps.app.goo.gl/Vo6sdYuapKE6972Y6',
    );
  });
});

describe('GeocoderService.geocodeVenueAddress', () => {
  it("returns an address-level match, searched in the page's country", async () => {
    const fetch = nominatimReplies([
      nominatimResult('44.8138823', '20.4511922', 30),
    ]);

    await expect(
      new GeocoderService().geocodeVenueAddress(
        'Karađorđeva 46, Savamala',
        'RS',
      ),
    ).resolves.toEqual({ latitude: 44.8138823, longitude: 20.4511922 });

    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    const params = new URL(url).searchParams;
    expect(params.get('q')).toBe('Karađorđeva 46, Savamala');
    expect(params.get('countrycodes')).toBe('rs');
    expect(params.get('limit')).toBe('1');
    expect(init.headers).toMatchObject({ 'User-Agent': 'Tulum Host App' });
  });

  it.each([
    ['a street', nominatimResult('44.8430847', '20.4169292', 26)],
    ['a city', nominatimResult('44.8153318', '20.4456588', 25)],
    ['a result without a rank', { lat: '44.81', lon: '20.45' }],
  ])('returns null when Nominatim only matches %s', async (_, result) => {
    nominatimReplies([result]);

    await expect(
      new GeocoderService().geocodeVenueAddress('Zemunski Kej', 'RS'),
    ).resolves.toBeNull();
  });

  it('returns null when Nominatim has no match or fails', async () => {
    nominatimReplies([]);
    await expect(
      new GeocoderService().geocodeVenueAddress(
        'Bulevar vojvode Mišića 11, below Mostarska petlja',
      ),
    ).resolves.toBeNull();

    nominatimReplies({ error: 'Service unavailable' }, 503);
    await expect(
      new GeocoderService().geocodeVenueAddress('Crnogorska 12, Belgrade'),
    ).resolves.toBeNull();

    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));
    await expect(
      new GeocoderService().geocodeVenueAddress('Crnogorska 12, Belgrade'),
    ).resolves.toBeNull();
  });

  it('leaves out a country that is not a two-letter code', async () => {
    const fetch = nominatimReplies([
      nominatimResult('44.8148059', '20.4516152', 30),
    ]);

    await new GeocoderService().geocodeVenueAddress(
      'Crnogorska 12, Belgrade',
      'Serbia',
    );

    const [url] = fetch.mock.calls[0] as [string];
    expect(new URL(url).searchParams.has('countrycodes')).toBe(false);
  });

  it('sends at most one Nominatim request per second', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-24T20:00:00.000Z') });
    const fetch = nominatimReplies([
      nominatimResult('44.8138823', '20.4511922', 30),
    ]);
    const service = new GeocoderService();

    const lookups = [
      service.geocodeVenueAddress('Karađorđeva 46, Savamala'),
      service.geocodeVenueAddress('Crnogorska 12, Belgrade'),
      service.geocodeVenueAddress('Tadeuša Košćuška 63, Belgrade'),
    ];

    await jest.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(fetch).toHaveBeenCalledTimes(3);

    await expect(Promise.all(lookups)).resolves.toHaveLength(3);
  });
});

describe('GeocoderService.geocode (GET /geocode)', () => {
  it('still returns the best match for the host app, at any precision', async () => {
    nominatimReplies([
      {
        ...nominatimResult('44.8430847', '20.4169292', 26),
        display_name: 'Kej',
      },
    ]);

    await expect(
      new GeocoderService().geocode('Zemunski Kej'),
    ).resolves.toEqual({
      latitude: 44.8430847,
      longitude: 20.4169292,
      display_name: 'Kej',
    });
  });

  it('still throws "No results" when nothing matches', async () => {
    nominatimReplies([]);

    await expect(new GeocoderService().geocode('Nowhere 1')).rejects.toThrow(
      'No results found for address',
    );
  });
});

describe('toCoordinates', () => {
  it('accepts numbers and numeric strings', () => {
    expect(toCoordinates(44.79775, '20.44685')).toEqual({
      latitude: 44.79775,
      longitude: 20.44685,
    });
  });

  it.each([
    ['missing values', undefined, undefined],
    ['text', 'north', '20.4'],
    ['an empty string', '', '20.4'],
    ['a latitude out of range', 95, 20.4],
    ['a longitude out of range', 44.8, 200],
    ['the 0,0 placeholder', 0, 0],
  ])('rejects %s', (_, latitude, longitude) => {
    expect(toCoordinates(latitude, longitude)).toBeNull();
  });
});
