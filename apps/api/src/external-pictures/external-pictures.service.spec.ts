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
import axios, { AxiosError, AxiosResponse } from 'axios';
import sharp from 'sharp';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  ExternalPicture,
  ExternalPicturesDataService,
  PictureTable,
} from './external-pictures-data.service';
import { ExternalPicturesService } from './external-pictures.service';

const R2 = 'https://img.tulum-app.com';
const LEGACY_R2 = 'https://pub-0123.r2.dev';
const NOW = Date.parse('2026-11-24T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const event = (id: string, pictureUrl: string, upcoming = true) =>
  ({ table: 'events', id, pictureUrl, upcoming }) as ExternalPicture;

const venue = (id: string, pictureUrl: string) =>
  ({ table: 'venues', id, pictureUrl, upcoming: false }) as ExternalPicture;

let picture: Buffer;

beforeAll(async () => {
  picture = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#d04040' },
  })
    .png()
    .toBuffer();
});

function httpError(status: number) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status } as AxiosResponse,
  );
}

function setup({
  pictures,
  failing = null,
  saved = true,
  currentPicture,
  configured = true,
}: {
  pictures: ExternalPicture[];
  /** What Redis holds for the job's failed downloads. */
  failing?: Record<string, { sourceUrl: string; since: string }> | null;
  /** Whether the guarded update finds the row unchanged. */
  saved?: boolean;
  /** The row's picture_url after a lost update. */
  currentPicture?: string | null;
  configured?: boolean;
}) {
  const data = {
    fetchExternalPictures: jest.fn((base: string) => {
      void base;
      return Promise.resolve(pictures);
    }),
    replacePicture: jest.fn(
      (table: PictureTable, id: string, from: string, to: string | null) => {
        void [table, id, from, to];
        return Promise.resolve(saved);
      },
    ),
    currentPicture: jest.fn((table: PictureTable, id: string) => {
      void [table, id];
      return Promise.resolve(currentPicture);
    }),
  };
  const r2 = {
    publicBaseUrl: R2,
    isConfigured: () => configured,
    extractKeyFromUrl: (url: string) => {
      for (const base of [R2, LEGACY_R2]) {
        if (url.startsWith(`${base}/`)) return url.slice(base.length + 1);
      }
      return null;
    },
    uploadAndProcessImage: jest.fn(
      (buffer: Buffer, key: string, width: number, height: number) => {
        void [buffer, width, height];
        return Promise.resolve(`${R2}/${key}`);
      },
    ),
    deleteObject: jest.fn((key: string) => {
      void key;
      return Promise.resolve();
    }),
  };
  const redis = {
    get: jest.fn(() => Promise.resolve(failing)),
    set: jest.fn((key: string, value: unknown, ttlSeconds: number) => {
      void [key, value, ttlSeconds];
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      void key;
      return Promise.resolve();
    }),
  };

  const service = new ExternalPicturesService(
    data as unknown as ExternalPicturesDataService,
    r2 as unknown as R2Service,
    redis as unknown as RedisService,
  );
  return { service, data, r2, redis };
}

describe('ExternalPicturesService', () => {
  let download: jest.SpiedFunction<typeof axios.get>;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    download = jest
      .spyOn(axios, 'get')
      .mockImplementation(() => Promise.resolve({ data: picture }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("stores each picture in R2 under the row's key and points the row at it", async () => {
    const { service, data, r2, redis } = setup({
      pictures: [
        event('e1', 'https://eventzeka.com/api/discover/images/e1'),
        venue('v1', 'https://framerusercontent.com/images/v1.jpg'),
      ],
    });

    const run = await service.storeExternalPictures();

    expect(data.fetchExternalPictures).toHaveBeenCalledWith(R2);
    // The venue first: its picture stands in for its events'.
    expect(r2.uploadAndProcessImage.mock.calls).toEqual([
      [picture, 'venue-images/scraped/v1/picture.webp', 200, 200],
      [picture, 'event-images/scraped/e1/picture.webp', 500, 375],
    ]);
    expect(data.replacePicture.mock.calls).toEqual([
      [
        'venues',
        'v1',
        'https://framerusercontent.com/images/v1.jpg',
        `${R2}/venue-images/scraped/v1/picture.webp`,
      ],
      [
        'events',
        'e1',
        'https://eventzeka.com/api/discover/images/e1',
        `${R2}/event-images/scraped/e1/picture.webp`,
      ],
    ]);
    expect(run).toMatchObject({
      external: 2,
      stored: 2,
      removed: 0,
      failed: 0,
      leftForNextRun: 0,
    });
    expect(redis.del).toHaveBeenCalledWith('external-pictures:failing');
  });

  it('stops after reading the database when every picture is in R2', async () => {
    const { service, r2, redis } = setup({
      // On the bucket's earlier address: stored, though not on the current one.
      pictures: [event('e1', `${LEGACY_R2}/event-images/host/e1.webp`)],
    });

    const run = await service.storeExternalPictures();

    expect(run).toMatchObject({ external: 0, stored: 0 });
    expect(download).not.toHaveBeenCalled();
    expect(r2.uploadAndProcessImage).not.toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('downloads a picture that rows share once', async () => {
    const poster = 'https://assets.tickets.rs/poster.jpg';
    const { service, r2 } = setup({
      pictures: [event('e1', poster), event('e2', poster)],
    });

    await service.storeExternalPictures();

    expect(download).toHaveBeenCalledTimes(1);
    expect(r2.uploadAndProcessImage.mock.calls.map(([, key]) => key)).toEqual([
      'event-images/scraped/e1/picture.webp',
      'event-images/scraped/e2/picture.webp',
    ]);
  });

  it('clears a picture that is gone', async () => {
    download.mockRejectedValue(httpError(404));
    const gone = 'https://firebasestorage.googleapis.com/v0/b/x/o/gone.jpg';
    const { service, data, r2 } = setup({ pictures: [event('e1', gone)] });

    const run = await service.storeExternalPictures();

    expect(data.replacePicture).toHaveBeenCalledWith(
      'events',
      'e1',
      gone,
      null,
    );
    expect(r2.uploadAndProcessImage).not.toHaveBeenCalled();
    expect(run.results).toEqual([
      {
        table: 'events',
        id: 'e1',
        sourceUrl: gone,
        outcome: 'removed',
        error: 'HTTP 404',
      },
    ]);
  });

  it('tries a failed download again, and clears the picture after a day of failures', async () => {
    download.mockRejectedValue(httpError(503));
    const flaky = 'https://eventzeka.com/api/discover/images/e1';

    const first = setup({ pictures: [event('e1', flaky)] });
    const firstRun = await first.service.storeExternalPictures();

    expect(firstRun).toMatchObject({ failed: 1, removed: 0 });
    expect(first.data.replacePicture).not.toHaveBeenCalled();
    expect(first.redis.set).toHaveBeenCalledWith(
      'external-pictures:failing',
      { 'events:e1': { sourceUrl: flaky, since: new Date(NOW).toISOString() } },
      7 * 24 * 60 * 60,
    );

    const dayLater = setup({
      pictures: [event('e1', flaky)],
      failing: {
        'events:e1': {
          sourceUrl: flaky,
          since: new Date(NOW - 24 * HOUR_MS).toISOString(),
        },
      },
    });
    const laterRun = await dayLater.service.storeExternalPictures();

    expect(laterRun).toMatchObject({ failed: 0, removed: 1 });
    expect(dayLater.data.replacePicture).toHaveBeenCalledWith(
      'events',
      'e1',
      flaky,
      null,
    );
    expect(dayLater.redis.del).toHaveBeenCalledWith(
      'external-pictures:failing',
    );
  });

  it('counts the day of failures again when the row points somewhere new', async () => {
    download.mockRejectedValue(httpError(503));
    const { service, data, redis } = setup({
      pictures: [event('e1', 'https://eventzeka.com/api/discover/images/new')],
      failing: {
        'events:e1': {
          sourceUrl: 'https://eventzeka.com/api/discover/images/old',
          since: new Date(NOW - 48 * HOUR_MS).toISOString(),
        },
      },
    });

    const run = await service.storeExternalPictures();

    expect(run).toMatchObject({ failed: 1, removed: 0 });
    expect(data.replacePicture).not.toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(
      'external-pictures:failing',
      {
        'events:e1': {
          sourceUrl: 'https://eventzeka.com/api/discover/images/new',
          since: new Date(NOW).toISOString(),
        },
      },
      expect.any(Number),
    );
  });

  it('forgets failed downloads of rows that no longer link another site', async () => {
    const { service, redis } = setup({
      pictures: [event('e1', 'https://assets.tickets.rs/a.jpg')],
      failing: {
        'events:gone': {
          sourceUrl: 'https://assets.tickets.rs/gone.jpg',
          since: new Date(NOW - HOUR_MS).toISOString(),
        },
      },
    });

    await service.storeExternalPictures();

    expect(redis.set).not.toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith('external-pictures:failing');
  });

  it('deletes the stored copy when the row changed during the run', async () => {
    const { service, r2 } = setup({
      pictures: [event('e1', 'https://assets.tickets.rs/poster.jpg')],
      saved: false,
      // The host uploaded a picture meanwhile.
      currentPicture: `${R2}/event-images/host/venue/upload.webp`,
    });

    const run = await service.storeExternalPictures();

    expect(run.results[0].outcome).toBe('row-changed');
    expect(run).toMatchObject({ stored: 0, failed: 0 });
    expect(r2.deleteObject).toHaveBeenCalledWith(
      'event-images/scraped/e1/picture.webp',
    );
  });

  it('keeps the stored copy when another run already pointed the row at it', async () => {
    const { service, r2 } = setup({
      pictures: [event('e1', 'https://assets.tickets.rs/poster.jpg')],
      saved: false,
      currentPicture: `${R2}/event-images/scraped/e1/picture.webp`,
    });

    await service.storeExternalPictures();

    expect(r2.deleteObject).not.toHaveBeenCalled();
  });

  it('downloads but saves nothing in a dry run', async () => {
    download
      .mockResolvedValueOnce({ data: picture })
      .mockRejectedValueOnce(httpError(404));
    const { service, data, r2, redis } = setup({
      pictures: [
        event('e1', 'https://assets.tickets.rs/a.jpg'),
        event('e2', 'https://assets.tickets.rs/gone.jpg'),
      ],
    });

    const run = await service.storeExternalPictures({ dryRun: true });

    expect(run.results.map((result) => result.outcome)).toEqual([
      'downloaded',
      'download-failed',
    ]);
    expect(r2.uploadAndProcessImage).not.toHaveBeenCalled();
    expect(data.replacePicture).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('takes venues, then upcoming events, then past events, up to 200 a run', async () => {
    const past = Array.from({ length: 150 }, (_, i) =>
      event(`past${i}`, `https://assets.tickets.rs/past${i}.jpg`, false),
    );
    const upcoming = Array.from({ length: 60 }, (_, i) =>
      event(`up${i}`, `https://assets.tickets.rs/up${i}.jpg`),
    );
    const { service, r2 } = setup({
      pictures: [...past, ...upcoming, venue('v1', 'https://x.test/v1.jpg')],
    });

    const run = await service.storeExternalPictures();

    const keys = r2.uploadAndProcessImage.mock.calls.map(([, key]) => key);
    expect(keys).toHaveLength(200);
    expect(keys[0]).toBe('venue-images/scraped/v1/picture.webp');
    expect(keys[1]).toBe('event-images/scraped/up0/picture.webp');
    expect(keys[61]).toBe('event-images/scraped/past0/picture.webp');
    expect(run).toMatchObject({ external: 211, leftForNextRun: 11 });
  });

  it('does nothing when R2 is not configured', async () => {
    const { service, data } = setup({
      pictures: [event('e1', 'https://assets.tickets.rs/a.jpg')],
      configured: false,
    });

    await expect(service.storeExternalPictures()).resolves.toMatchObject({
      external: 0,
    });
    expect(data.fetchExternalPictures).not.toHaveBeenCalled();
  });

  it('refuses a second run while one is going', async () => {
    let finishDownload: (value: { data: Buffer }) => void = () => undefined;
    download.mockImplementation(
      () => new Promise((resolve) => (finishDownload = resolve)),
    );
    const { service } = setup({
      pictures: [event('e1', 'https://assets.tickets.rs/a.jpg')],
    });

    const first = service.storeExternalPictures();
    await new Promise((resolve) => setImmediate(resolve));

    await expect(service.storeExternalPictures()).rejects.toBeInstanceOf(
      ConflictException,
    );
    finishDownload({ data: picture });
    await expect(first).resolves.toMatchObject({ stored: 1 });
  });

  it('counts the pictures still on other sites by site', async () => {
    const { service } = setup({
      pictures: [
        event('e1', 'https://eventzeka.com/api/discover/images/e1'),
        event('e2', 'https://eventzeka.com/api/discover/images/e2', false),
        venue('v1', 'https://framerusercontent.com/images/v1.jpg'),
        event('e3', `${LEGACY_R2}/event-images/host/e3.webp`),
      ],
      failing: {
        'events:e1': {
          sourceUrl: 'https://eventzeka.com/api/discover/images/e1',
          since: new Date(NOW).toISOString(),
        },
      },
    });

    await expect(service.previewExternalPictures()).resolves.toEqual({
      events: 2,
      upcomingEvents: 1,
      venues: 1,
      byHost: { 'eventzeka.com': 2, 'framerusercontent.com': 1 },
      failing: 1,
    });
    expect(download).not.toHaveBeenCalled();
  });
});
