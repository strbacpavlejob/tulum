import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios, { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { RedisService } from '../redis/redis.service';
import {
  CarouselSlide,
  InstagramGraphService,
  StoryImage,
} from './instagram-graph.service';

// A Unified login system-user token, and an Instagram Login token.
const TOKEN = 'EAA-token-from-railway';
const IG_TOKEN = 'IGAA-token-from-railway';
const ENV_KEYS = [
  'INSTAGRAM_ACCESS_TOKEN',
  'INSTAGRAM_USER_ID',
  'INSTAGRAM_GRAPH_API_VERSION',
];

interface Call {
  method: 'get' | 'post';
  url: string;
  /** The path without the API version. */
  path: string;
  params: Record<string, string>;
}

interface GraphBehaviour {
  tags?: 'refuse';
  containerStatus?: string;
  /** How many container calls get a server error before one goes through. */
  containerServerErrors?: number;
  publish?: 'refuse' | 'timeout' | 'server-error' | 'expired-token';
  renewal?: 'fail';
}

function graphError(
  status: number,
  message: string,
  code?: number,
  subcode?: number,
): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { error: { message, code, error_subcode: subcode } },
  } as AxiosResponse);
}

/* A fake graph.facebook.com and graph.instagram.com behind axios, recording
 * every call. */
function graphApi(behaviour: GraphBehaviour = {}): Call[] {
  const calls: Call[] = [];
  let items = 0;
  let serverErrors = behaviour.containerServerErrors ?? 0;
  const pathOf = (url: string) =>
    new URL(url).pathname.replace(/^\/v\d+\.\d+/, '');

  jest
    .spyOn(axios, 'get')
    .mockImplementation(
      (url: string, config?: { params?: Record<string, string> }) => {
        const call: Call = {
          method: 'get',
          url,
          path: pathOf(url),
          params: config?.params ?? {},
        };
        calls.push(call);
        if (call.path === '/refresh_access_token') {
          return behaviour.renewal === 'fail'
            ? Promise.reject(graphError(400, 'Token too new'))
            : Promise.resolve({
                data: {
                  access_token: `IGAA-renewed-${calls.length}`,
                  expires_in: 5183944,
                },
              });
        }
        if (call.path === '/me/assigned_instagram_accounts') {
          return Promise.resolve({ data: { data: [{ id: '1789' }] } });
        }
        if (call.path === '/me') {
          return Promise.resolve({ data: { data: [{ user_id: 1789 }] } });
        }
        if (call.params.fields === 'status_code,status') {
          return Promise.resolve({
            data: {
              status_code: behaviour.containerStatus ?? 'FINISHED',
              status: '2207003',
            },
          });
        }
        if (call.params.fields === 'permalink') {
          return Promise.resolve({
            data: { permalink: 'https://www.instagram.com/p/abc/' },
          });
        }
        return Promise.reject(new Error(`Unexpected GET ${call.path}`));
      },
    );

  jest
    .spyOn(axios, 'post')
    .mockImplementation((url: string, body: URLSearchParams) => {
      const call: Call = {
        method: 'post',
        url,
        path: pathOf(url),
        params: Object.fromEntries(body),
      };
      calls.push(call);
      if (call.path.endsWith('/media')) {
        if (serverErrors > 0) {
          serverErrors -= 1;
          return Promise.reject(
            graphError(503, 'Service temporarily unavailable', 2),
          );
        }
        if (call.params.media_type === 'CAROUSEL') {
          return Promise.resolve({ data: { id: 'carousel' } });
        }
        if (call.params.user_tags && behaviour.tags === 'refuse') {
          return Promise.reject(graphError(400, 'Invalid user tag', 100));
        }
        if (call.params.media_type === 'STORIES') {
          return Promise.resolve({ data: { id: 'story' } });
        }
        items += 1;
        return Promise.resolve({ data: { id: `item-${items}` } });
      }
      if (call.path.endsWith('/media_publish')) {
        switch (behaviour.publish) {
          case 'refuse':
            return Promise.reject(
              graphError(400, 'Too many posts', 9, 2207042),
            );
          case 'expired-token':
            return Promise.reject(graphError(400, 'Session expired', 190, 463));
          case 'server-error':
            return Promise.reject(graphError(500, 'An unknown error occurred'));
          case 'timeout':
            return Promise.reject(
              new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED'),
            );
          default:
            return Promise.resolve({ data: { id: 'media-1' } });
        }
      }
      return Promise.reject(new Error(`Unexpected POST ${call.path}`));
    });

  return calls;
}

/* Just enough of RedisService, keeping values in a Map. */
function fakeRedis() {
  const store = new Map<string, unknown>();
  return {
    store,
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  };
}

function serviceWith(redis = fakeRedis()) {
  const service = new InstagramGraphService(redis as unknown as RedisService);
  // No waiting between status checks.
  Object.assign(service, { sleep: () => Promise.resolve() });
  return { service, redis };
}

const SLIDES: CarouselSlide[] = [
  {
    imageUrl: 'https://img.tulum-app.com/instagram-posts/x/01.jpg',
    userTags: [],
  },
  {
    imageUrl: 'https://img.tulum-app.com/instagram-posts/x/02.jpg',
    userTags: [{ username: 'kptm.bar', x: 0.5, y: 0.44 }],
  },
  {
    imageUrl: 'https://img.tulum-app.com/instagram-posts/x/03.jpg',
    userTags: [],
  },
];

describe('InstagramGraphService', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.INSTAGRAM_ACCESS_TOKEN = TOKEN;
    delete process.env.INSTAGRAM_USER_ID;
    delete process.env.INSTAGRAM_GRAPH_API_VERSION;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    jest.restoreAllMocks();
  });

  describe('publishCarousel', () => {
    it('makes a container per slide and one for the carousel, then publishes it', async () => {
      const calls = graphApi();
      const { service } = serviceWith();

      await expect(
        service.publishCarousel(SLIDES, 'This week in Belgrade'),
      ).resolves.toEqual({
        status: 'published',
        mediaId: 'media-1',
        permalink: 'https://www.instagram.com/p/abc/',
      });

      expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
        'get /me/assigned_instagram_accounts',
        'post /1789/media',
        'post /1789/media',
        'post /1789/media',
        'get /item-1',
        'get /item-2',
        'get /item-3',
        'post /1789/media',
        'get /carousel',
        'post /1789/media_publish',
        'get /media-1',
      ]);
      expect(calls[1].params).toEqual({
        image_url: SLIDES[0].imageUrl,
        is_carousel_item: 'true',
        access_token: TOKEN,
      });
      expect(JSON.parse(calls[2].params.user_tags)).toEqual([
        { username: 'kptm.bar', x: 0.5, y: 0.44 },
      ]);
      expect(calls[7].params).toMatchObject({
        media_type: 'CAROUSEL',
        children: 'item-1,item-2,item-3',
        caption: 'This week in Belgrade',
      });
      expect(calls[9].params).toMatchObject({ creation_id: 'carousel' });
      expect(
        calls.every((call) =>
          call.url.startsWith('https://graph.facebook.com/v27.0/'),
        ),
      ).toBe(true);
      expect(calls.every((call) => call.params.access_token === TOKEN)).toBe(
        true,
      );
    });

    it('uses graph.instagram.com and /me with an Instagram Login token', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = IG_TOKEN;
      const calls = graphApi();
      const { service } = serviceWith();

      await expect(
        service.publishCarousel(SLIDES, 'caption'),
      ).resolves.toMatchObject({ status: 'published' });

      expect(calls[0]).toMatchObject({
        url: 'https://graph.instagram.com/v27.0/me',
        params: { fields: 'user_id,username' },
      });
      expect(calls[1].url).toBe('https://graph.instagram.com/v27.0/1789/media');
    });

    it('uses INSTAGRAM_USER_ID when it is set', async () => {
      process.env.INSTAGRAM_USER_ID = '42';
      const calls = graphApi();
      const { service } = serviceWith();

      await service.publishCarousel(SLIDES, 'caption');

      expect(calls.some((call) => /^\/me(\/|$)/.test(call.path))).toBe(false);
      expect(calls[0].path).toBe('/42/media');
    });

    it('posts a slide untagged when Instagram refuses its tags', async () => {
      const calls = graphApi({ tags: 'refuse' });
      const { service } = serviceWith();

      const result = await service.publishCarousel(SLIDES, 'caption');

      expect(result.status).toBe('published');
      const slideCalls = calls.filter(
        (call) => call.path === '/1789/media' && !call.params.media_type,
      );
      expect(slideCalls).toHaveLength(4);
      expect(slideCalls[1].params.user_tags).toBeDefined();
      expect(slideCalls[2].params.user_tags).toBeUndefined();
      expect(slideCalls[2].params.image_url).toBe(SLIDES[1].imageUrl);
    });

    it('publishes nothing when a container fails', async () => {
      const calls = graphApi({ containerStatus: 'ERROR' });
      const { service } = serviceWith();

      const result = await service.publishCarousel(SLIDES, 'caption');

      expect(result).toEqual({
        status: 'failed',
        error: expect.stringContaining('is ERROR (2207003)'),
      });
      expect(calls.some((call) => call.path.endsWith('/media_publish'))).toBe(
        false,
      );
    });

    it('reports a refused media_publish as failed, and no clear answer as unknown', async () => {
      graphApi({ publish: 'refuse' });
      await expect(
        serviceWith().service.publishCarousel(SLIDES, 'caption'),
      ).resolves.toEqual({
        status: 'failed',
        error: 'Too many posts [9/2207042]',
      });
      jest.restoreAllMocks();

      graphApi({ publish: 'timeout' });
      await expect(
        serviceWith().service.publishCarousel(SLIDES, 'caption'),
      ).resolves.toEqual({ status: 'unknown', error: 'ECONNABORTED' });
      jest.restoreAllMocks();

      graphApi({ publish: 'server-error' });
      await expect(
        serviceWith().service.publishCarousel(SLIDES, 'caption'),
      ).resolves.toMatchObject({ status: 'unknown' });
    });

    it('says when the token has expired, and never shows it', async () => {
      graphApi({ publish: 'expired-token' });
      const result = await serviceWith().service.publishCarousel(
        SLIDES,
        'caption',
      );

      expect(result.status).toBe('failed');
      const error = 'error' in result ? result.error : '';
      expect(error).toContain('set a new INSTAGRAM_ACCESS_TOKEN');
      expect(error).not.toContain(TOKEN);
    });

    it('calls nothing without a token', async () => {
      delete process.env.INSTAGRAM_ACCESS_TOKEN;
      const calls = graphApi();
      const { service } = serviceWith();

      expect(service.isConfigured()).toBe(false);
      await expect(service.publishCarousel(SLIDES, 'caption')).resolves.toEqual(
        { status: 'failed', error: 'INSTAGRAM_ACCESS_TOKEN is not set' },
      );
      expect(calls).toHaveLength(0);
    });
  });

  describe('publishStory', () => {
    const STORY: StoryImage = {
      imageUrl: 'https://img.tulum-app.com/instagram-stories/x/01.jpg',
      mentions: ['kptm.bar'],
    };

    it('makes a story container that mentions the venue, then publishes it', async () => {
      const calls = graphApi();
      const { service } = serviceWith();

      await expect(service.publishStory(STORY)).resolves.toEqual({
        status: 'published',
        mediaId: 'media-1',
        permalink: 'https://www.instagram.com/p/abc/',
      });

      expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
        'get /me/assigned_instagram_accounts',
        'post /1789/media',
        'get /story',
        'post /1789/media_publish',
        'get /media-1',
      ]);
      expect(calls[1].params).toMatchObject({
        media_type: 'STORIES',
        image_url: STORY.imageUrl,
      });
      // A story's tags take no position.
      expect(JSON.parse(calls[1].params.user_tags)).toEqual([
        { username: 'kptm.bar' },
      ]);
      expect(calls[3].params).toMatchObject({ creation_id: 'story' });
    });

    it('posts the story without the mention when Instagram refuses it', async () => {
      const calls = graphApi({ tags: 'refuse' });
      const { service } = serviceWith();

      await expect(service.publishStory(STORY)).resolves.toMatchObject({
        status: 'published',
      });
      const containers = calls.filter((call) => call.path === '/1789/media');
      expect(containers).toHaveLength(2);
      expect(containers[1].params.user_tags).toBeUndefined();
      expect(containers[1].params.media_type).toBe('STORIES');
    });

    it('sends nothing to tag without a venue handle', async () => {
      const calls = graphApi();

      await serviceWith().service.publishStory({ ...STORY, mentions: [] });

      expect(calls[1].params.user_tags).toBeUndefined();
    });

    it('reports a story whose media_publish got no clear answer as unknown', async () => {
      graphApi({ publish: 'timeout' });

      await expect(serviceWith().service.publishStory(STORY)).resolves.toEqual({
        status: 'unknown',
        error: 'ECONNABORTED',
      });
    });
  });

  describe('server errors', () => {
    it('tries a container again after a server error', async () => {
      const calls = graphApi({ containerServerErrors: 2 });
      const { service } = serviceWith();

      await expect(
        service.publishStory({
          imageUrl: 'https://img.tulum-app.com/s.jpg',
          mentions: [],
        }),
      ).resolves.toMatchObject({ status: 'published' });
      expect(calls.filter((call) => call.path === '/1789/media')).toHaveLength(
        3,
      );
    });

    it('gives up on a container after three server errors', async () => {
      const calls = graphApi({ containerServerErrors: 3 });
      const { service } = serviceWith();

      await expect(
        service.publishStory({
          imageUrl: 'https://img.tulum-app.com/s.jpg',
          mentions: [],
        }),
      ).resolves.toEqual({
        status: 'failed',
        error: 'Service temporarily unavailable [2]',
      });
      expect(calls.filter((call) => call.path === '/1789/media')).toHaveLength(
        3,
      );
      expect(calls.some((call) => call.path.endsWith('/media_publish'))).toBe(
        false,
      );
    });

    it('never sends media_publish twice', async () => {
      const calls = graphApi({ publish: 'server-error' });

      await expect(
        serviceWith().service.publishCarousel(SLIDES, 'caption'),
      ).resolves.toMatchObject({ status: 'unknown' });
      expect(
        calls.filter((call) => call.path.endsWith('/media_publish')),
      ).toHaveLength(1);
    });
  });

  describe('renewTokenIfDue', () => {
    const now = new Date('2026-12-01T17:05:00Z');
    const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

    it('leaves a Unified login token alone: it never expires', async () => {
      const calls = graphApi();
      const { service, redis } = serviceWith();

      await expect(service.renewTokenIfDue(now)).resolves.toBe('never-expires');
      expect(calls).toHaveLength(0);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('renews an Instagram Login token and posts with the renewed one from then on', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = IG_TOKEN;
      const calls = graphApi();
      const { service } = serviceWith();

      await expect(service.renewTokenIfDue(now)).resolves.toBe('renewed');
      expect(calls[0]).toMatchObject({
        url: 'https://graph.instagram.com/refresh_access_token',
        params: { grant_type: 'ig_refresh_token', access_token: IG_TOKEN },
      });

      await service.publishCarousel(SLIDES, 'caption');
      expect(calls[1].params.access_token).toBe('IGAA-renewed-1');
    });

    it('renews it once a week, starting from the renewed token', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = IG_TOKEN;
      const calls = graphApi();
      const { service } = serviceWith();

      await service.renewTokenIfDue(now);
      await expect(service.renewTokenIfDue(days(6))).resolves.toBe('not-due');
      await expect(service.renewTokenIfDue(days(8))).resolves.toBe('renewed');

      expect(calls).toHaveLength(2);
      expect(calls[1].params.access_token).toBe('IGAA-renewed-1');
    });

    it('starts again from a new INSTAGRAM_ACCESS_TOKEN', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = IG_TOKEN;
      const calls = graphApi();
      const { service } = serviceWith();
      await service.renewTokenIfDue(now);

      process.env.INSTAGRAM_ACCESS_TOKEN = 'IGAA-a-new-token';
      await expect(service.renewTokenIfDue(days(1))).resolves.toBe('renewed');

      expect(calls[1].params.access_token).toBe('IGAA-a-new-token');
    });

    it('keeps the token when a renewal fails', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = IG_TOKEN;
      graphApi({ renewal: 'fail' });
      const { service, redis } = serviceWith();

      await expect(service.renewTokenIfDue(now)).resolves.toBe('failed');
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('does nothing without a token', async () => {
      delete process.env.INSTAGRAM_ACCESS_TOKEN;
      const calls = graphApi();

      await expect(serviceWith().service.renewTokenIfDue(now)).resolves.toBe(
        'not-configured',
      );
      expect(calls).toHaveLength(0);
    });
  });
});
