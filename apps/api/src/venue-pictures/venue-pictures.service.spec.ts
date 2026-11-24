import { ConflictException } from '@nestjs/common';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios from 'axios';
import sharp from 'sharp';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import { ApifyBudget } from './apify-budget';
import {
  ApifyResult,
  VenuePictureLookupService,
} from './venue-picture-lookup.service';
import { GoogleMapsPlace, InstagramProfile } from './venue-picture-rules';
import {
  VenuePicturesDataService,
  VenueWithoutPicture,
} from './venue-pictures-data.service';
import { VenuePicturesService } from './venue-pictures.service';

const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// A free account that has used $1 of the $3.50 the job allows.
const BUDGET: ApifyBudget = {
  usedUsd: 1,
  ceilingUsd: 3.5,
  cycleEndsAt: '2026-12-10T00:00:00.000Z',
};

const venue = (
  id: string,
  instagramHandle: string | null,
  name = `Venue ${id}`,
): VenueWithoutPicture => ({
  id,
  name,
  latitude: 44.8012,
  longitude: 20.4419,
  scraper: 'eventzeka',
  contactId: null,
  instagramHandle,
});

const profile = (username: string): InstagramProfile => ({
  username,
  fullName: username,
  profilePicUrl: `https://scontent.cdninstagram.com/${username}-150.jpg`,
  profilePicUrlHD: `https://scontent.cdninstagram.com/${username}-320.jpg`,
});

const listing = (title: string, website: string): GoogleMapsPlace => ({
  title,
  latitude: 44.8012,
  longitude: 20.4419,
  website,
  instagramUrls: [],
  permanentlyClosed: false,
});

let picture: Buffer;

beforeAll(async () => {
  picture = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#d04040' },
  })
    .png()
    .toBuffer();
});

function setup({
  venues,
  upcoming = [],
  handlesInUse = [],
  profiles = [],
  places = [],
  budget = BUDGET,
  complete = true,
}: {
  venues: VenueWithoutPicture[];
  upcoming?: string[];
  handlesInUse?: string[];
  profiles?: InstagramProfile[];
  places?: GoogleMapsPlace[];
  budget?: ApifyBudget;
  /** Whether the Apify runs finish. */
  complete?: boolean;
}) {
  const data = {
    fetchScrapedVenuesWithoutPicture: jest.fn(() => Promise.resolve(venues)),
    fetchVenueIdsWithUpcomingEvents: jest.fn(() =>
      Promise.resolve(new Set(upcoming)),
    ),
    fetchInstagramHandlesInUse: jest.fn(() =>
      Promise.resolve(new Set(handlesInUse)),
    ),
    setPictureIfMissing: jest.fn<
      (venueId: string, pictureUrl: string) => Promise<boolean>
    >(() => Promise.resolve(true)),
    saveInstagramHandle: jest.fn<
      (
        venue: { id: string; contactId: string | null },
        handle: string,
      ) => Promise<void>
    >(() => Promise.resolve()),
  };
  const lookup = {
    isConfigured: () => true,
    readBudget: jest.fn<() => Promise<ApifyBudget>>(() =>
      Promise.resolve(budget),
    ),
    fetchInstagramProfiles: jest.fn<
      (
        handles: string[],
        maxChargeUsd: number,
      ) => Promise<ApifyResult<Map<string, InstagramProfile>>>
    >((handles) =>
      Promise.resolve({
        found: new Map(
          profiles
            .filter((item) => handles.includes(item.username))
            .map((item) => [item.username, item]),
        ),
        complete,
      }),
    ),
    searchGoogleMaps: jest.fn<
      (
        venues: VenueWithoutPicture[],
        maxChargeUsd: number,
      ) => Promise<ApifyResult<GoogleMapsPlace[]>>
    >(() => Promise.resolve({ found: places, complete })),
  };
  const r2 = {
    uploadAndProcessImage: jest.fn<
      (
        buffer: Buffer,
        key: string,
        width: number,
        height: number,
      ) => Promise<string>
    >((_buffer, key) => Promise.resolve(`https://img.tulum-app.com/${key}`)),
  };
  const redisStore = new Map<string, unknown>();
  const redis = {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: jest.fn<
      (key: string, value: unknown, ttlSeconds: number) => Promise<void>
    >((key, value) => {
      redisStore.set(key, JSON.parse(JSON.stringify(value)));
      return Promise.resolve();
    }),
  };

  const service = new VenuePicturesService(
    data as unknown as VenuePicturesDataService,
    lookup as unknown as VenuePictureLookupService,
    r2 as unknown as R2Service,
    redis as unknown as RedisService,
  );
  return { service, data, lookup, r2, redis };
}

describe('VenuePicturesService', () => {
  let download: jest.SpiedFunction<typeof axios.get>;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    download = jest
      .spyOn(axios, 'get')
      .mockImplementation(() => Promise.resolve({ data: picture }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.VENUE_PICTURES_PROFILES_PER_RUN;
  });

  it("stores a venue's Instagram profile picture as its picture", async () => {
    const { service, data, lookup, r2 } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [profile('lastaclub')],
    });

    const run = await service.fillMissingPictures();

    expect(lookup.searchGoogleMaps).not.toHaveBeenCalled();
    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledWith(
      ['lastaclub'],
      0.005,
    );
    expect(download).toHaveBeenCalledWith(
      'https://scontent.cdninstagram.com/lastaclub-320.jpg',
      expect.anything(),
    );
    expect(r2.uploadAndProcessImage).toHaveBeenCalledWith(
      picture,
      'venue-images/scraped/a/instagram-profile.webp',
      200,
      200,
    );
    expect(data.setPictureIfMissing).toHaveBeenCalledWith(
      'a',
      'https://img.tulum-app.com/venue-images/scraped/a/instagram-profile.webp',
    );
    expect(run).toMatchObject({ pictures: 1, profilesRequested: 1 });
    expect(run.results).toEqual([
      {
        venueId: 'a',
        name: 'Venue a',
        instagramHandle: 'lastaclub',
        foundOnGoogleMaps: false,
        outcome: 'picture-saved',
      },
    ]);
  });

  it('finds a missing handle on Google Maps, saves it and uses its picture', async () => {
    const { service, data, lookup } = setup({
      venues: [venue('b', null, 'Lasta Club')],
      places: [listing('Lasta', 'https://www.instagram.com/lastaclub/')],
      profiles: [profile('lastaclub')],
    });

    const run = await service.fillMissingPictures();

    // The Google Maps actor takes no run capped below $0.50.
    expect(lookup.searchGoogleMaps).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'b' })],
      0.5,
    );
    expect(data.saveInstagramHandle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b', contactId: null }),
      'lastaclub',
    );
    expect(run.results).toEqual([
      expect.objectContaining({
        venueId: 'b',
        instagramHandle: 'lastaclub',
        foundOnGoogleMaps: true,
        outcome: 'picture-saved',
      }),
    ]);
  });

  it("uses but doesn't save a handle another venue already has", async () => {
    const { service, data } = setup({
      venues: [venue('b', null, 'Lasta Club')],
      handlesInUse: ['lastaclub'],
      places: [listing('Lasta', 'https://www.instagram.com/lastaclub/')],
      profiles: [profile('lastaclub')],
    });

    const run = await service.fillMissingPictures();

    expect(data.saveInstagramHandle).not.toHaveBeenCalled();
    expect(run.results[0].outcome).toBe('picture-saved');
  });

  it('saves nothing in a dry run', async () => {
    const { service, data, r2, redis } = setup({
      venues: [venue('a', 'lastaclub'), venue('b', null, 'Lasta Club')],
      places: [listing('Lasta', 'https://www.instagram.com/lasta.club/')],
      profiles: [profile('lastaclub'), profile('lasta.club')],
    });

    const run = await service.fillMissingPictures({ dryRun: true });

    expect(run.dryRun).toBe(true);
    expect(run.pictures).toBe(2);
    expect(run.results.map((result) => result.outcome)).toEqual([
      'picture-found',
      'picture-found',
    ]);
    expect(r2.uploadAndProcessImage).not.toHaveBeenCalled();
    expect(data.setPictureIfMissing).not.toHaveBeenCalled();
    expect(data.saveInstagramHandle).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("skips Instagram's blank avatar", async () => {
    const blank =
      'https://scontent.cdninstagram.com/v/t51.2885-19/44884218_345707102882519_2446069589734326272_n.jpg';
    const { service, data } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [
        {
          ...profile('lastaclub'),
          profilePicUrl: blank,
          profilePicUrlHD: blank,
        },
      ],
    });

    const run = await service.fillMissingPictures();

    expect(download).not.toHaveBeenCalled();
    expect(data.setPictureIfMissing).not.toHaveBeenCalled();
    expect(run.results[0].outcome).toBe('no-profile-picture');
  });

  it("doesn't pay for a venue again until a month after nothing was found", async () => {
    const { service, lookup } = setup({
      venues: [venue('a', 'gone.account'), venue('b', null, 'Lasta Club')],
      places: [],
    });

    const first = await service.fillMissingPictures();
    expect(first.results.map((result) => result.outcome).sort()).toEqual([
      'no-instagram-found',
      'profile-not-found',
    ]);

    const second = await service.fillMissingPictures();
    expect(second.waitingForRetry).toBe(2);
    expect(second.results).toEqual([]);
    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledTimes(1);
    expect(lookup.searchGoogleMaps).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockReturnValue(NOW + 31 * DAY_MS);
    const later = await service.fillMissingPictures();
    expect(later.waitingForRetry).toBe(0);
    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledTimes(2);
    expect(lookup.searchGoogleMaps).toHaveBeenCalledTimes(2);
  });

  it('tries a failed download again after a week', async () => {
    download.mockImplementation(() => Promise.reject(new Error('HTTP 403')));
    const { service, redis } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [profile('lastaclub')],
    });

    const run = await service.fillMissingPictures();

    expect(run.results[0].outcome).toBe('download-failed');
    expect(redis.set).toHaveBeenCalledWith(
      'venue-pictures:tried',
      {
        a: {
          retryAt: new Date(NOW + 7 * DAY_MS).toISOString(),
          outcome: 'download-failed',
        },
      },
      expect.any(Number),
    );
  });

  it('refuses a download that is not a picture', async () => {
    download.mockImplementation(() =>
      Promise.resolve({ data: Buffer.from('<html>Login</html>') }),
    );
    const { service, r2 } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [profile('lastaclub')],
    });

    const run = await service.fillMissingPictures();

    expect(r2.uploadAndProcessImage).not.toHaveBeenCalled();
    expect(run.results[0].outcome).toBe('download-failed');
  });

  it('takes venues with an upcoming event first, up to the run limit', async () => {
    process.env.VENUE_PICTURES_PROFILES_PER_RUN = '1';
    const { service, lookup } = setup({
      venues: [venue('a', 'first'), venue('b', 'second'), venue('c', 'third')],
      upcoming: ['c'],
      profiles: [profile('first'), profile('second'), profile('third')],
    });

    const run = await service.fillMissingPictures();

    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledWith(
      ['third'],
      0.005,
    );
    expect(run.results.map((result) => result.venueId)).toEqual(['c']);
    expect(run.leftForNextRun).toBe(2);
  });

  it('downloads a picture once for venues that share an account', async () => {
    const { service, r2 } = setup({
      venues: [venue('a', 'blndr.bg'), venue('b', 'blndr.bg')],
      profiles: [profile('blndr.bg')],
    });

    const run = await service.fillMissingPictures();

    expect(download).toHaveBeenCalledTimes(1);
    expect(r2.uploadAndProcessImage).toHaveBeenCalledTimes(2);
    expect(run.pictures).toBe(2);
  });

  it('still fills venues with a handle when Google Maps fails', async () => {
    const { service, lookup, redis } = setup({
      venues: [venue('a', 'lastaclub'), venue('b', null, 'Lasta Club')],
      profiles: [profile('lastaclub')],
    });
    lookup.searchGoogleMaps.mockRejectedValue(new Error('Apify is down'));

    const run = await service.fillMissingPictures();

    expect(run.results).toEqual([
      expect.objectContaining({ venueId: 'b', outcome: 'lookup-failed' }),
      expect.objectContaining({ venueId: 'a', outcome: 'picture-saved' }),
    ]);
    // Searched again in 6 hours, not in the next hourly run.
    expect(redis.set).toHaveBeenCalledWith(
      'venue-pictures:tried',
      {
        b: {
          retryAt: new Date(NOW + 6 * HOUR_MS).toISOString(),
          outcome: 'lookup-failed',
        },
      },
      expect.any(Number),
    );
  });

  it("doesn't take profiles a stopped run never reached for missing", async () => {
    const { service } = setup({
      venues: [venue('a', 'lastaclub'), venue('b', 'second')],
      profiles: [profile('lastaclub')],
      complete: false,
    });

    const run = await service.fillMissingPictures();

    expect(run.results.map((result) => result.outcome)).toEqual([
      'picture-saved',
      'lookup-failed',
    ]);
  });

  it('asks Apify nothing when no venue is due', async () => {
    const { service, lookup } = setup({ venues: [] });

    const run = await service.fillMissingPictures();

    expect(run.apifyBudget).toBeNull();
    expect(lookup.readBudget).not.toHaveBeenCalled();
    expect(lookup.fetchInstagramProfiles).not.toHaveBeenCalled();
  });

  it('spends nothing once the account reaches the budget', async () => {
    const { service, lookup, redis } = setup({
      venues: [venue('a', 'lastaclub'), venue('b', null, 'Lasta Club')],
      profiles: [profile('lastaclub')],
      budget: { ...BUDGET, usedUsd: 3.5 },
    });

    const run = await service.fillMissingPictures();

    expect(lookup.searchGoogleMaps).not.toHaveBeenCalled();
    expect(lookup.fetchInstagramProfiles).not.toHaveBeenCalled();
    expect(run.results).toEqual([]);
    expect(run.leftForNextRun).toBe(2);
    // Nothing is held back: the venues are due when the next cycle starts.
    expect(redis.set).toHaveBeenCalledWith(
      'venue-pictures:tried',
      {},
      expect.any(Number),
    );
  });

  it('looks up only as many profiles as the budget has left', async () => {
    const { service, lookup } = setup({
      venues: [venue('a', 'first'), venue('b', 'second'), venue('c', 'third')],
      profiles: [profile('first'), profile('second'), profile('third')],
      budget: { ...BUDGET, usedUsd: 3.49 },
    });

    const run = await service.fillMissingPictures();

    // $0.01 left, at most $0.005 a profile.
    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledWith(
      ['first', 'second'],
      0.01,
    );
    expect(run.leftForNextRun).toBe(1);
  });

  it('skips Google Maps until the budget covers its $0.50 minimum', async () => {
    const { service, lookup } = setup({
      venues: [venue('a', 'lastaclub'), venue('b', null, 'Lasta Club')],
      profiles: [profile('lastaclub')],
      budget: { ...BUDGET, usedUsd: 3.2 },
    });

    const run = await service.fillMissingPictures();

    expect(lookup.searchGoogleMaps).not.toHaveBeenCalled();
    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledWith(
      ['lastaclub'],
      0.005,
    );
    expect(run.leftForNextRun).toBe(1);
  });

  it('reads the usage again after a Google Maps run', async () => {
    const { service, lookup } = setup({
      venues: [venue('a', 'lastaclub'), venue('b', null, 'Lasta Club')],
      places: [listing('Lasta', 'https://www.instagram.com/lasta.club/')],
      profiles: [profile('lastaclub'), profile('lasta.club')],
    });
    lookup.readBudget
      .mockResolvedValueOnce(BUDGET)
      .mockResolvedValueOnce({ ...BUDGET, usedUsd: 3.495 });

    await service.fillMissingPictures();

    // $0.005 left after the search: the found handle's profile only.
    expect(lookup.fetchInstagramProfiles).toHaveBeenCalledWith(
      ['lasta.club'],
      0.005,
    );
  });

  it("looks nothing up when Apify can't tell the account's usage", async () => {
    const { service, lookup } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [profile('lastaclub')],
    });
    lookup.readBudget.mockRejectedValue(new Error('403 Forbidden'));

    const run = await service.fillMissingPictures();

    expect(lookup.fetchInstagramProfiles).not.toHaveBeenCalled();
    expect(run.leftForNextRun).toBe(1);
  });

  it('keeps a picture the venue got while the run was looking', async () => {
    const { service, data } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [profile('lastaclub')],
    });
    data.setPictureIfMissing.mockResolvedValue(false);

    const run = await service.fillMissingPictures();

    expect(run.results[0].outcome).toBe('picture-already-set');
    expect(run.pictures).toBe(0);
  });

  it('refuses a second run while one is going', async () => {
    const { service } = setup({
      venues: [venue('a', 'lastaclub')],
      profiles: [profile('lastaclub')],
    });

    const first = service.fillMissingPictures();
    await expect(service.fillMissingPictures()).rejects.toBeInstanceOf(
      ConflictException,
    );
    await first;
    await expect(service.fillMissingPictures()).resolves.toBeDefined();
  });

  it('counts the venues without a picture without looking anything up', async () => {
    const { service, lookup } = setup({
      venues: [
        venue('a', 'lastaclub'),
        venue('b', null),
        { ...venue('c', 'third'), scraper: 'goout' },
      ],
      upcoming: ['a'],
    });

    await expect(service.previewMissingPictures()).resolves.toEqual({
      venuesWithoutPicture: 3,
      withInstagram: 2,
      withUpcomingEvents: 1,
      waitingForRetry: 0,
      byScraper: { eventzeka: 2, goout: 1 },
      apifyBudget: BUDGET,
    });
    expect(lookup.fetchInstagramProfiles).not.toHaveBeenCalled();
    expect(lookup.searchGoogleMaps).not.toHaveBeenCalled();
  });
});
