import { afterEach, describe, expect, it, jest } from '@jest/globals';
import * as downloads from '../common/download-picture';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  InstagramGraphService,
  PublishResult,
  StoryImage,
  TokenRenewal,
} from './instagram-graph.service';
import { GROUP_VENUE_TYPES, PostEvent } from './instagram-post-rules';
import { InstagramPostsDataService } from './instagram-posts-data.service';
import {
  InstagramStoriesService,
  StorySlotRecord,
} from './instagram-stories.service';
import * as slides from './instagram-slides';
import {
  Publication,
  PublicationFormat,
  PublicationHistoryMissingError,
  PublicationHistoryService,
} from './publication-history.service';

// Friday 27 November: 10:00 in Belgrade is 09:00 UTC.
const AT_10 = new Date('2026-11-27T09:00:00Z');
const minutes = (n: number) => new Date(AT_10.getTime() + n * 60_000);
const SLOT_KEY = 'instagram-stories:slot:2026-11-27T10:00';
const BUCKET = 'https://img.tulum-app.com/';
const ENV_KEYS = [
  'INSTAGRAM_STORIES_SCHEDULE',
  'INSTAGRAM_STORIES_EVENTS',
  'INSTAGRAM_STORIES_WINDOW_HOURS',
];

function event(
  overrides: Partial<PostEvent> & Pick<PostEvent, 'id'>,
): PostEvent {
  const group = overrides.group ?? 'bars';
  return {
    title: `Event ${overrides.id}`,
    startsAt: '2026-11-27T19:00:00Z',
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

const EVENTS: PostEvent[] = [
  event({ id: 'bar', instagramHandle: 'kptm.bar' }),
  event({ id: 'club', group: 'clubs', startsAt: '2026-11-27T22:00:00Z' }),
  event({ id: 'gig', group: 'culture', startsAt: '2026-11-28T19:00:00Z' }),
  event({ id: 'dinner', group: 'food', startsAt: '2026-11-28T18:00:00Z' }),
];

const PUBLISHED = (n: number): PublishResult => ({
  status: 'published',
  mediaId: `media-${n}`,
  permalink: `https://www.instagram.com/stories/tulum_app/${n}/`,
});

interface Setup {
  events?: PostEvent[];
  promoted?: Publication[];
  recent?: Publication[];
  publishResults?: PublishResult[];
  missingPictures?: string[];
  /** Events another run claims first. */
  takenByOthers?: string[];
  historyMissing?: boolean;
  redisDown?: boolean;
  instagramConfigured?: boolean;
  random?: number;
}

function setup({
  events = EVENTS,
  promoted = [],
  recent = [],
  publishResults = [],
  missingPictures = [],
  takenByOthers = [],
  historyMissing = false,
  redisDown = false,
  instagramConfigured = true,
  random = 0.99,
}: Setup = {}) {
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

  const data = {
    fetchEvents: jest.fn<(from: Date, until: Date) => Promise<PostEvent[]>>(
      () => Promise.resolve(events),
    ),
  };

  // The table: an event's claim, by event id.
  const rows = new Map<
    string,
    { format: PublicationFormat; status: string; runKey: string }
  >();
  for (const id of takenByOthers) {
    rows.set(id, { format: 'feed', status: 'publishing', runKey: 'other' });
  }
  const missing = () => Promise.reject(new PublicationHistoryMissingError());
  const history = {
    rows,
    promotedEvents: jest.fn(() =>
      historyMissing ? missing() : Promise.resolve(promoted),
    ),
    storiesSince: jest.fn(() =>
      historyMissing ? missing() : Promise.resolve(recent),
    ),
    hasRun: jest.fn((prefix: string) =>
      Promise.resolve(
        [...rows.values()].some((row) => row.runKey.startsWith(prefix)),
      ),
    ),
    claim: jest.fn(
      (ids: readonly string[], format: PublicationFormat, runKey: string) => {
        const claimed = new Set<string>();
        for (const id of ids) {
          if (rows.has(id)) continue;
          rows.set(id, { format, status: 'publishing', runKey });
          claimed.add(id);
        }
        return Promise.resolve(claimed);
      },
    ),
    markPublished: jest.fn<
      (
        ids: readonly string[],
        runKey: string,
        media: { mediaId: string; permalink: string | null },
      ) => Promise<void>
    >((ids, runKey) => {
      for (const id of ids) {
        const row = rows.get(id);
        if (row?.runKey === runKey) row.status = 'published';
      }
      return Promise.resolve();
    }),
    markUnknown: jest.fn<
      (ids: readonly string[], runKey: string, error: string) => Promise<void>
    >((ids, runKey) => {
      for (const id of ids) {
        const row = rows.get(id);
        if (row?.runKey === runKey) row.status = 'unknown';
      }
      return Promise.resolve();
    }),
    release: jest.fn((ids: readonly string[], runKey: string) => {
      for (const id of ids) {
        if (rows.get(id)?.runKey === runKey) rows.delete(id);
      }
      return Promise.resolve();
    }),
  };

  const results = [...publishResults];
  let published = 0;
  const graph = {
    isConfigured: jest.fn(() => instagramConfigured),
    renewTokenIfDue: jest.fn<(now?: Date) => Promise<TokenRenewal>>(() =>
      Promise.resolve('never-expires'),
    ),
    publishStory: jest.fn<(story: StoryImage) => Promise<PublishResult>>(() =>
      Promise.resolve(results.shift() ?? PUBLISHED(++published)),
    ),
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
    .spyOn(slides, 'renderStory')
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

  const service = new InstagramStoriesService(
    data as unknown as InstagramPostsDataService,
    history as unknown as PublicationHistoryService,
    graph as unknown as InstagramGraphService,
    r2 as unknown as R2Service,
    redis as unknown as RedisService,
  );
  // 0.99 asks for 3 stories; the picks themselves are covered by the rules' specs.
  Object.assign(service, { random: () => random });
  return { service, data, history, graph, r2, redis, uploads, render };
}

describe('InstagramStoriesService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("publishes the slot's stories at 10:00, and marks each event once Instagram confirms it", async () => {
    const { service, graph, history, redis, data } = setup();

    const run = await service.publishDueStories(AT_10);

    expect(run).toMatchObject({
      slot: '2026-11-27T10:00',
      outcome: 'published',
      eligible: 4,
      attempts: 1,
    });
    expect(run?.stories).toHaveLength(3);
    expect(run?.stories.every((s) => s.status === 'published')).toBe(true);
    // Three groups, in date order.
    expect(new Set(run?.stories.map((s) => s.group)).size).toBe(3);
    const starts = run!.stories.map((s) => Date.parse(s.startsAt));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));

    // Events starting from an hour after the run until 48 hours after it.
    expect(data.fetchEvents).toHaveBeenCalledWith(
      new Date('2026-11-27T10:00:00Z'),
      new Date('2026-11-29T09:00:00Z'),
    );
    const [ids, format, runKey] = history.claim.mock.calls[0];
    expect(format).toBe('story');
    expect(runKey).toMatch(/^story:2026-11-27T10:00:[a-z0-9]+$/);
    expect(ids).toHaveLength(3);
    expect(history.markPublished).toHaveBeenCalledTimes(3);
    expect(history.markPublished.mock.calls[0][2]).toEqual({
      mediaId: 'media-1',
      permalink: 'https://www.instagram.com/stories/tulum_app/1/',
    });
    expect([...history.rows.values()].map((row) => row.status)).toEqual([
      'published',
      'published',
      'published',
    ]);
    expect(graph.publishStory).toHaveBeenCalledTimes(3);
    expect(redis.store.get(SLOT_KEY)).toMatchObject({
      status: 'done',
      outcome: 'published',
      attempts: 1,
    });
    // The lock is let go.
    expect(redis.store.has('instagram-stories:lock')).toBe(false);
  });

  it('mentions the venue, and stores each story where Instagram can fetch it, then deletes it', async () => {
    const { service, graph, uploads, r2 } = setup({
      events: [EVENTS[0]],
    });

    await service.publishDueStories(AT_10);

    expect(graph.publishStory).toHaveBeenCalledWith({
      imageUrl: `${BUCKET}${uploads[0]}`,
      mentions: ['kptm.bar'],
    });
    expect(uploads[0]).toMatch(
      /^instagram-stories\/2026-11-27T1000-[a-z0-9]+\/01\.jpg$/,
    );
    expect(r2.deleteFolder).toHaveBeenCalledWith(
      uploads[0].replace('01.jpg', ''),
    );
  });

  it('runs a slot once: the later ticks find it done', async () => {
    const { service, graph } = setup();

    await service.publishDueStories(AT_10);
    await expect(service.publishDueStories(minutes(5))).resolves.toMatchObject({
      outcome: 'already-done',
    });
    await expect(service.publishDueStories(minutes(40))).resolves.toMatchObject(
      { outcome: 'already-done' },
    );
    expect(graph.publishStory).toHaveBeenCalledTimes(3);
  });

  it("doesn't run a slot again when its record is lost but the history shows it ran", async () => {
    const { service, graph, redis } = setup();
    await service.publishDueStories(AT_10);
    redis.store.delete(SLOT_KEY);

    await expect(service.publishDueStories(minutes(5))).resolves.toMatchObject({
      outcome: 'already-done',
    });
    expect(graph.publishStory).toHaveBeenCalledTimes(3);
  });

  it('does nothing outside the 45 minutes after a slot', async () => {
    const { service, data } = setup();

    await expect(service.publishDueStories(minutes(-5))).resolves.toBeNull();
    await expect(service.publishDueStories(minutes(45))).resolves.toBeNull();
    expect(data.fetchEvents).not.toHaveBeenCalled();
  });

  it('leaves out promoted events and events whose title is a promoted one', async () => {
    const { service, graph } = setup({
      promoted: [
        promotedEvent('bar', 'Event bar'),
        promotedEvent('elsewhere', 'Event club'),
      ],
    });

    const run = await service.publishDueStories(AT_10);

    expect(run?.eligible).toBe(2);
    expect(run?.stories.map((s) => s.eventId).sort()).toEqual([
      'dinner',
      'gig',
    ]);
    expect(graph.publishStory).toHaveBeenCalledTimes(2);
  });

  it('skips the slot when every event is promoted, rather than repeating one', async () => {
    const { service, graph, redis } = setup({
      promoted: EVENTS.map((e) => promotedEvent(e.id, e.title)),
    });

    await expect(service.publishDueStories(AT_10)).resolves.toMatchObject({
      outcome: 'nothing-to-publish',
      eligible: 0,
    });
    expect(graph.publishStory).not.toHaveBeenCalled();
    expect(redis.store.get(SLOT_KEY)).toMatchObject({
      status: 'done',
      outcome: 'nothing-to-publish',
    });
  });

  it('frees an event whose story failed, skips the rest, and tries the slot again at 10:10 and 10:30', async () => {
    const failure: PublishResult = {
      status: 'failed',
      error: 'Container is ERROR',
    };
    const { service, graph, history, redis } = setup({
      publishResults: [failure, failure, failure],
    });

    const first = await service.publishDueStories(AT_10);
    expect(first).toMatchObject({
      outcome: 'failed',
      attempts: 1,
      retryAt: '2026-11-27T09:10:00.000Z',
      error: 'Container is ERROR',
    });
    expect(first?.stories.map((s) => s.status)).toEqual([
      'failed',
      'skipped',
      'skipped',
    ]);
    expect(history.markPublished).not.toHaveBeenCalled();
    expect(history.release).toHaveBeenCalledTimes(3);
    expect(history.rows.size).toBe(0);

    await expect(service.publishDueStories(minutes(5))).resolves.toMatchObject({
      outcome: 'waiting',
      retryAt: '2026-11-27T09:10:00.000Z',
    });
    await expect(service.publishDueStories(minutes(10))).resolves.toMatchObject(
      { outcome: 'failed', attempts: 2, retryAt: '2026-11-27T09:30:00.000Z' },
    );
    await expect(service.publishDueStories(minutes(30))).resolves.toMatchObject(
      { outcome: 'failed', attempts: 3 },
    );
    expect(redis.store.get(SLOT_KEY)).toMatchObject({
      status: 'done',
      outcome: 'failed',
      attempts: 3,
    });
    await expect(service.publishDueStories(minutes(35))).resolves.toMatchObject(
      { outcome: 'already-done' },
    );
    expect(graph.publishStory).toHaveBeenCalledTimes(3);
  });

  it('keeps an event whose story may have gone out, and leaves the slot done', async () => {
    const { service, history, redis } = setup({
      events: [EVENTS[0]],
      publishResults: [{ status: 'unknown', error: 'ECONNABORTED' }],
    });

    await expect(service.publishDueStories(AT_10)).resolves.toMatchObject({
      outcome: 'unknown',
      error: 'ECONNABORTED',
    });
    expect(history.markUnknown).toHaveBeenCalledWith(
      ['bar'],
      expect.stringMatching(/^story:/),
      'ECONNABORTED',
    );
    expect(history.rows.get('bar')?.status).toBe('unknown');
    expect(redis.store.get(SLOT_KEY)).toMatchObject({ status: 'done' });
  });

  it("swaps an event whose picture won't download, or that another run took, for another", async () => {
    const { service } = setup({
      events: [
        ...EVENTS,
        event({ id: 'bar-2', startsAt: '2026-11-28T21:00:00Z' }),
        event({ id: 'club-2', group: 'clubs' }),
      ],
      missingPictures: ['bar'],
      takenByOthers: ['club'],
      random: 0,
    });
    process.env.INSTAGRAM_STORIES_EVENTS = '4';

    const run = await service.publishDueStories(AT_10);

    const ids = run?.stories.map((s) => s.eventId) ?? [];
    expect(ids).toHaveLength(4);
    expect(ids).not.toContain('bar');
    expect(ids).not.toContain('club');
  });

  it("doesn't publish without the history table, and says what to apply", async () => {
    const { service, graph, redis } = setup({ historyMissing: true });

    const run = await service.publishDueStories(AT_10);

    expect(run).toMatchObject({ outcome: 'not-configured' });
    expect(run?.error).toContain('20261126213507_social_media_publications');
    expect(graph.publishStory).not.toHaveBeenCalled();
    // Once per slot, not every five minutes.
    expect(redis.store.get(SLOT_KEY)).toMatchObject({ status: 'done' });
  });

  it("publishes nothing while another run holds the lock, or when Redis doesn't answer", async () => {
    const busy = setup();
    busy.redis.store.set('instagram-stories:lock', { slot: 'manual' });
    await expect(busy.service.publishDueStories(AT_10)).resolves.toMatchObject({
      outcome: 'in-progress',
    });

    const down = setup({ redisDown: true });
    await expect(down.service.publishDueStories(AT_10)).resolves.toMatchObject({
      outcome: 'failed',
    });

    expect(busy.graph.publishStory).not.toHaveBeenCalled();
    expect(down.graph.publishStory).not.toHaveBeenCalled();
  });

  it('records a slot without a token once, and posts nothing', async () => {
    const { service, data, redis } = setup({ instagramConfigured: false });

    await expect(service.publishDueStories(AT_10)).resolves.toMatchObject({
      outcome: 'not-configured',
      error: 'INSTAGRAM_ACCESS_TOKEN is not set',
    });
    await expect(service.publishDueStories(minutes(5))).resolves.toMatchObject({
      outcome: 'already-done',
    });
    expect(data.fetchEvents).not.toHaveBeenCalled();
    expect(redis.store.get(SLOT_KEY)).toMatchObject({
      outcome: 'not-configured',
    });
  });

  it('follows the schedule, event count and window in the environment', async () => {
    process.env.INSTAGRAM_STORIES_SCHEDULE = '9:30';
    process.env.INSTAGRAM_STORIES_EVENTS = '1';
    process.env.INSTAGRAM_STORIES_WINDOW_HOURS = '24';
    const { service, data } = setup();

    await expect(service.publishDueStories(AT_10)).resolves.toMatchObject({
      slot: '2026-11-27T09:30',
    });
    const run = await service.publish({ now: AT_10 });
    expect(run.stories).toHaveLength(1);
    expect(data.fetchEvents).toHaveBeenCalledWith(
      new Date('2026-11-27T10:00:00Z'),
      new Date('2026-11-28T09:00:00Z'),
    );
  });

  it('publishes now outside the schedule, under the same rules', async () => {
    const { service, history } = setup();

    const run = await service.publish({ now: minutes(-120) });

    expect(run).toMatchObject({ slot: 'manual', outcome: 'published' });
    expect(history.claim.mock.calls[0][2]).toMatch(/^story:manual:/);
  });

  it('draws a dry run’s stories to look at, without claiming or posting', async () => {
    const { service, graph, history, uploads, r2 } = setup({
      instagramConfigured: false,
    });

    const run = await service.publish({ dryRun: true, now: AT_10 });

    expect(run.outcome).toBe('previewed');
    expect(run.stories.map((s) => s.status)).toEqual([
      'previewed',
      'previewed',
      'previewed',
    ]);
    expect(run.stories[0].imageUrl).toBe(`${BUCKET}${uploads[0]}`);
    expect(
      uploads.every((key) => key.startsWith('instagram-stories/preview/')),
    ).toBe(true);
    expect(r2.deleteFolder).toHaveBeenCalledWith('instagram-stories/preview/');
    expect(history.claim).not.toHaveBeenCalled();
    expect(graph.publishStory).not.toHaveBeenCalled();
  });

  it('plans without drawing, claiming or posting anything', async () => {
    const { service, render, history, redis } = setup({
      recent: [promotedEvent('yesterday', 'Old night')],
    });

    const plan = await service.plan(minutes(5));

    expect(plan).toMatchObject({
      schedule: ['10:00', '15:00', '18:00'],
      windowHours: 48,
      events: { min: 2, max: 3 },
      configured: { instagram: true, r2: true, history: true },
      dueSlot: { slot: '2026-11-27T10:00', record: null },
      nextSlot: '2026-11-27T15:00',
    });
    expect(plan.eligible).toHaveLength(4);
    expect(plan.samplePick).toHaveLength(3);
    expect(plan.recentStories).toEqual([
      expect.objectContaining({ eventId: 'yesterday' }),
    ]);
    expect(render).not.toHaveBeenCalled();
    expect(history.claim).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('plans with the history missing, and says so', async () => {
    const { service } = setup({ historyMissing: true });

    const plan = await service.plan(AT_10);

    expect(plan.configured.history).toBe(false);
    expect(plan.error).toContain('apply migrations/');
  });

  it("names a slot's record fields the plan shows", async () => {
    const { service, redis } = setup();
    const record: StorySlotRecord = {
      status: 'done',
      outcome: 'published',
      at: AT_10.toISOString(),
      attempts: 1,
      stories: [{ eventId: 'bar', mediaId: 'media-1' }],
    };
    redis.store.set(SLOT_KEY, record);

    await expect(service.plan(minutes(5))).resolves.toMatchObject({
      dueSlot: { slot: '2026-11-27T10:00', record },
    });
  });
});

function promotedEvent(eventId: string, title: string): Publication {
  return {
    eventId,
    title,
    venueId: `venue-${eventId}`,
    format: 'story',
    status: 'published',
    runKey: 'story:2026-11-26T18:00:abc',
    createdAt: '2026-11-26T17:01:00Z',
  };
}
