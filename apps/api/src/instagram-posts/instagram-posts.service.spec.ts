import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as downloads from '../common/download-picture';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  CarouselSlide,
  InstagramGraphService,
  PublishResult,
  TokenRenewal,
} from './instagram-graph.service';
import { GROUP_VENUE_TYPES, PostEvent } from './instagram-post-rules';
import { InstagramPostsDataService } from './instagram-posts-data.service';
import { InstagramPostsService, PostRecord } from './instagram-posts.service';
import * as slides from './instagram-slides';

// Monday 30 November, 18:05 in Belgrade: the week's post is due.
const MONDAY = new Date('2026-11-30T17:05:00Z');
const SATURDAY = new Date('2026-12-05T17:05:00Z');
const BUCKET = 'https://img.tulum-app.com/';
const RECORD_KEY = 'instagram-posts:published:2026-11-30:week';

function event(
  overrides: Partial<PostEvent> & Pick<PostEvent, 'id'>,
): PostEvent {
  const group = overrides.group ?? 'bars';
  return {
    title: `Event ${overrides.id}`,
    startsAt: '2026-12-01T19:00:00Z',
    pictureUrl: `${BUCKET}event-images/${overrides.id}.webp`,
    venueId: `venue-${overrides.id}`,
    venueName: `Venue ${overrides.id}`,
    venueType: GROUP_VENUE_TYPES[group][0],
    group,
    instagramHandle: null,
    guestCount: 0,
    ...overrides,
  };
}

const WEEK: PostEvent[] = [
  event({
    id: 'bar',
    startsAt: '2026-12-01T19:00:00Z',
    instagramHandle: 'kptm.bar',
  }),
  event({ id: 'gig', group: 'culture', startsAt: '2026-12-02T19:00:00Z' }),
  event({ id: 'dinner', group: 'food', startsAt: '2026-12-03T19:00:00Z' }),
  event({ id: 'club', group: 'clubs', startsAt: '2026-12-04T21:00:00Z' }),
];

const PUBLISHED: PublishResult = {
  status: 'published',
  mediaId: 'media-1',
  permalink: 'https://www.instagram.com/p/abc/',
};

function setup({
  events = WEEK,
  instagramConfigured = true,
  publishResults = [PUBLISHED],
  missingPictures = [] as string[],
  redisDown = false,
} = {}) {
  const store = new Map<string, unknown>();
  const redis = {
    store,
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    setIfAbsent: jest.fn((key: string, value: unknown) => {
      if (redisDown) return Promise.resolve(null);
      if (store.has(key)) return Promise.resolve(false);
      store.set(key, value);
      return Promise.resolve(true);
    }),
  };
  const data = { fetchEvents: jest.fn(() => Promise.resolve(events)) };
  const results = [...publishResults];
  const graph = {
    isConfigured: jest.fn(() => instagramConfigured),
    renewTokenIfDue: jest.fn<(now?: Date) => Promise<TokenRenewal>>(() =>
      Promise.resolve('not-due'),
    ),
    publishCarousel: jest.fn<
      (slides: CarouselSlide[], caption: string) => Promise<PublishResult>
    >(() => Promise.resolve(results.shift() ?? PUBLISHED)),
  };
  const uploads: string[] = [];
  const r2 = {
    isConfigured: jest.fn(() => true),
    extractKeyFromUrl: jest.fn((url: string) =>
      url.startsWith(BUCKET) ? url.slice(BUCKET.length) : null,
    ),
    uploadBuffer: jest.fn((key: string) => {
      uploads.push(key);
      return Promise.resolve(`${BUCKET}${key}`);
    }),
    deleteFolder: jest.fn<(prefix: string) => Promise<number>>(() =>
      Promise.resolve(0),
    ),
  };

  const render = jest
    .spyOn(slides, 'renderSlide')
    .mockResolvedValue(Buffer.from('jpeg'));
  jest
    .spyOn(downloads, 'downloadPicture')
    .mockImplementation((url: string) =>
      Promise.resolve(
        missingPictures.some((id) => url.includes(`/${id}.webp`))
          ? { error: 'HTTP 404', gone: true }
          : { picture: Buffer.from('picture') },
      ),
    );

  const service = new InstagramPostsService(
    data as unknown as InstagramPostsDataService,
    graph as unknown as InstagramGraphService,
    r2 as unknown as R2Service,
    redis as unknown as RedisService,
  );
  return { service, data, graph, r2, redis, uploads, render };
}

describe('InstagramPostsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.INSTAGRAM_POSTS_SCHEDULE;
  });

  it("publishes the day's post once, however many runs try", async () => {
    const { service, data, graph, redis } = setup();

    const run = await service.publishScheduledPost(MONDAY);

    expect(run).toMatchObject({
      date: '2026-11-30',
      kind: 'week',
      outcome: 'published',
      mediaId: 'media-1',
      permalink: 'https://www.instagram.com/p/abc/',
    });
    expect(run.events.map((e) => e.id)).toEqual([
      'bar',
      'gig',
      'dinner',
      'club',
    ]);
    expect(run.caption).toContain('This week in Belgrade');
    expect(graph.renewTokenIfDue).toHaveBeenCalledWith(MONDAY);
    expect(redis.store.get(RECORD_KEY)).toMatchObject({
      status: 'published',
      mediaId: 'media-1',
    });

    await expect(service.publishScheduledPost(MONDAY)).resolves.toMatchObject({
      outcome: 'already-published',
      mediaId: 'media-1',
    });
    expect(graph.publishCarousel).toHaveBeenCalledTimes(1);
    // The later run stopped before reading the events.
    expect(data.fetchEvents).toHaveBeenCalledTimes(1);
  });

  it('posts a cover, a slide per event with its venue tagged, and a closing slide', async () => {
    const { service, graph, uploads, r2 } = setup();

    await service.publish('week', { now: MONDAY });

    const [carousel] = graph.publishCarousel.mock.calls[0];
    expect(carousel).toHaveLength(6);
    expect(carousel.map((slide) => slide.userTags)).toEqual([
      [],
      [{ username: 'kptm.bar', x: 0.5, y: 0.44 }],
      [],
      [],
      [],
      [],
    ]);
    expect(uploads).toHaveLength(6);
    expect(uploads[0]).toMatch(
      /^instagram-posts\/2026-11-30-week-[a-z0-9]+\/01\.jpg$/,
    );
    // The slides are deleted once Instagram has them.
    expect(r2.deleteFolder).toHaveBeenCalledWith(
      uploads[0].replace('01.jpg', ''),
    );
  });

  it('lets the next run try again after a failure', async () => {
    const { service, graph, redis } = setup({
      publishResults: [{ status: 'failed', error: 'Container is ERROR' }],
    });

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({
      outcome: 'failed',
      error: 'Container is ERROR',
    });
    expect(redis.store.has(RECORD_KEY)).toBe(false);

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({ outcome: 'published' });
    expect(graph.publishCarousel).toHaveBeenCalledTimes(2);
  });

  it("doesn't post again when it's unknown whether a post went out", async () => {
    const { service, graph, redis } = setup({
      publishResults: [{ status: 'unknown', error: 'ECONNABORTED' }],
    });

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({ outcome: 'unknown' });
    expect(redis.store.get(RECORD_KEY)).toMatchObject({ status: 'unknown' });

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({
      outcome: 'already-published',
      error: 'ECONNABORTED',
    });
    expect(graph.publishCarousel).toHaveBeenCalledTimes(1);
  });

  it("posts nothing when Redis can't record it", async () => {
    const { service, graph } = setup({ redisDown: true });

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({ outcome: 'failed' });
    expect(graph.publishCarousel).not.toHaveBeenCalled();
  });

  it('leaves a post another run is publishing to that run', async () => {
    const { service, graph, redis } = setup();
    const claim: PostRecord = {
      status: 'publishing',
      at: MONDAY.toISOString(),
    };
    redis.store.set(RECORD_KEY, claim);

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({ outcome: 'in-progress' });
    expect(graph.publishCarousel).not.toHaveBeenCalled();
  });

  it('posts nothing on a day without a post, or without a token', async () => {
    const saturday = setup();
    await expect(
      saturday.service.publishScheduledPost(SATURDAY),
    ).resolves.toMatchObject({ kind: null, outcome: 'nothing-scheduled' });

    const noToken = setup({ instagramConfigured: false });
    await expect(
      noToken.service.publishScheduledPost(MONDAY),
    ).resolves.toMatchObject({ kind: 'week', outcome: 'not-configured' });
    expect(noToken.data.fetchEvents).not.toHaveBeenCalled();
  });

  it('follows INSTAGRAM_POSTS_SCHEDULE', async () => {
    process.env.INSTAGRAM_POSTS_SCHEDULE = 'sat:week';
    const { service } = setup();

    await expect(service.publishScheduledPost(SATURDAY)).resolves.toMatchObject(
      { kind: 'week', outcome: 'published' },
    );
  });

  it("doesn't post fewer than three events", async () => {
    const { service, graph, uploads } = setup({ events: WEEK.slice(0, 2) });

    await expect(
      service.publish('week', { now: MONDAY }),
    ).resolves.toMatchObject({ outcome: 'not-enough-events', caption: null });
    expect(uploads).toHaveLength(0);
    expect(graph.publishCarousel).not.toHaveBeenCalled();
  });

  it("swaps an event whose picture won't download for another", async () => {
    const { service } = setup({
      events: [
        ...WEEK,
        event({ id: 'bar-2', startsAt: '2026-12-05T20:00:00Z' }),
      ],
      missingPictures: ['bar'],
    });

    const run = await service.publish('bars', { now: MONDAY });

    expect(run.events.map((e) => e.id)).toEqual(['bar-2']);
  });

  it('leaves out events whose picture is not stored in R2', async () => {
    const { service } = setup({
      events: [
        ...WEEK,
        event({ id: 'linked', pictureUrl: 'https://eventzeka.com/x.jpg' }),
      ],
    });

    const run = await service.publish('week', { now: MONDAY });

    expect(run.events.map((e) => e.id)).not.toContain('linked');
  });

  it('stores a dry run’s slides to look at, and posts nothing', async () => {
    const { service, graph, redis, r2, uploads } = setup({
      instagramConfigured: false,
    });

    const run = await service.publish('week', { dryRun: true, now: MONDAY });

    expect(run.outcome).toBe('previewed');
    expect(run.slideUrls).toHaveLength(6);
    expect(
      uploads.every((key) => key.startsWith('instagram-posts/preview/')),
    ).toBe(true);
    expect(r2.deleteFolder).toHaveBeenCalledWith('instagram-posts/preview/');
    expect(redis.setIfAbsent).not.toHaveBeenCalled();
    expect(graph.publishCarousel).not.toHaveBeenCalled();
  });

  it("plans today's post without drawing or storing anything", async () => {
    const { service, uploads, render } = setup();

    const plan = await service.plan(undefined, MONDAY);

    expect(plan).toMatchObject({
      date: '2026-11-30',
      kind: 'week',
      schedule: {
        mon: 'week',
        tue: 'culture',
        wed: 'food',
        thu: 'bars',
        fri: 'clubs',
      },
      configured: { instagram: true, r2: true },
      record: null,
    });
    expect(plan.events).toHaveLength(4);
    expect(plan.caption).toContain('@kptm.bar');
    expect(render).not.toHaveBeenCalled();
    expect(uploads).toHaveLength(0);
  });
});
