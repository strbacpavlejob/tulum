/**
 * The calls VenuePictureLookupService makes to Apify, against a fake
 * ApifyClient: nothing reaches Apify and nothing is charged.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { VenuePictureLookupService } from './venue-picture-lookup.service';

type CallOptions = { maxTotalChargeUsd: number; log: null; timeout: number };

function setup({
  status = 'SUCCEEDED',
  items = [] as Record<string, unknown>[],
} = {}) {
  const call = jest.fn<
    (input: Record<string, unknown>, options: CallOptions) => Promise<unknown>
  >(() =>
    Promise.resolve({ id: 'run-1', status, defaultDatasetId: 'dataset-1' }),
  );
  const actor = jest.fn<(id: string) => { call: typeof call }>(() => ({
    call,
  }));
  const client = {
    actor,
    dataset: () => ({ listItems: () => Promise.resolve({ items }) }),
    user: () => ({
      limits: () =>
        Promise.resolve({
          monthlyUsageCycle: {
            startAt: new Date('2026-11-10T00:00:00.000Z'),
            endAt: new Date('2026-12-10T00:00:00.000Z'),
          },
          limits: { maxMonthlyUsageUsd: 5 },
          current: { monthlyUsageUsd: 1.25 },
        }),
    }),
  };

  const service = new VenuePictureLookupService({
    get: () => 'apify-token',
  } as unknown as ConfigService);
  Object.assign(service, { client });
  return { service, actor, call };
}

afterEach(() => {
  delete process.env.VENUE_PICTURES_APIFY_BUDGET_USD;
});

describe('VenuePictureLookupService', () => {
  it("reads the account's usage against the job's budget", async () => {
    const { service } = setup();

    await expect(service.readBudget()).resolves.toEqual({
      usedUsd: 1.25,
      ceilingUsd: 3.5,
      cycleEndsAt: '2026-12-10T00:00:00.000Z',
    });

    process.env.VENUE_PICTURES_APIFY_BUDGET_USD = '10';
    await expect(service.readBudget()).resolves.toMatchObject({
      ceilingUsd: 5,
    });
  });

  it('caps the profile run at the charge it is given', async () => {
    const { service, actor, call } = setup({
      items: [
        {
          username: 'LastaClub',
          fullName: 'Lasta Club',
          profilePicUrl: 'https://scontent.cdninstagram.com/small.jpg',
          profilePicUrlHD: 'https://scontent.cdninstagram.com/large.jpg',
        },
        { error: 'not_found', errorDescription: 'Profile does not exist' },
      ],
    });

    const result = await service.fetchInstagramProfiles(
      ['lastaclub', 'gone.account'],
      0.01,
    );

    expect(actor).toHaveBeenCalledWith('apify/instagram-profile-scraper');
    expect(call).toHaveBeenCalledWith(
      { usernames: ['lastaclub', 'gone.account'] },
      expect.objectContaining({ maxTotalChargeUsd: 0.01, log: null }),
    );
    expect(result.complete).toBe(true);
    expect([...result.found.keys()]).toEqual(['lastaclub']);
  });

  it('says when a run stopped before it finished', async () => {
    const { service } = setup({ status: 'TIMED-OUT' });

    const result = await service.fetchInstagramProfiles(['lastaclub'], 0.005);

    expect(result.complete).toBe(false);
  });

  it("searches Google Maps around each venue and reads its sites' contacts", async () => {
    const { service, actor, call } = setup({
      items: [
        {
          title: 'Lasta',
          location: { lat: 44.8012, lng: 20.4419 },
          website: 'https://lastaclub.rs/',
          instagrams: ['https://www.instagram.com/lastaclub/'],
          permanentlyClosed: false,
        },
      ],
    });

    const result = await service.searchGoogleMaps(
      [{ name: 'Lasta Club', latitude: 44.8012, longitude: 20.4419 }],
      0.5,
    );

    expect(actor).toHaveBeenCalledWith('compass/crawler-google-places');
    expect(call).toHaveBeenCalledWith(
      expect.objectContaining({
        startUrls: [
          {
            url: 'https://www.google.com/maps/search/Lasta%20Club/@44.8012,20.4419,17z',
          },
        ],
        scrapeContacts: true,
      }),
      expect.objectContaining({ maxTotalChargeUsd: 0.5, log: null }),
    );
    expect(result.found).toEqual([
      {
        title: 'Lasta',
        latitude: 44.8012,
        longitude: 20.4419,
        website: 'https://lastaclub.rs/',
        instagramUrls: ['https://www.instagram.com/lastaclub/'],
        permanentlyClosed: false,
      },
    ]);
  });

  it('starts no run for an empty list', async () => {
    const { service, call } = setup();

    await expect(service.fetchInstagramProfiles([], 1)).resolves.toEqual({
      found: new Map(),
      complete: true,
    });
    await expect(service.searchGoogleMaps([], 1)).resolves.toEqual({
      found: [],
      complete: true,
    });
    expect(call).not.toHaveBeenCalled();
  });
});
