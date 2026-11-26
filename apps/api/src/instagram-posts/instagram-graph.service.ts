import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { RedisService } from '../redis/redis.service';

/*
 * Publishes to Tulum's Instagram account through Instagram's own API. Meta's
 * rules and the account's setup are in docs/instagram-posts.md.
 *
 * The API has two setups, told apart by the token. Unified login, the only
 * one Meta's dashboard gives new apps (Tulum's included) since late 2026,
 * issues system-user tokens (they start with EAA) that never expire and are
 * used at graph.facebook.com. Instagram Login, which older apps keep, issues
 * Instagram tokens (they start with IG) that last 60 days unless renewed,
 * used at graph.instagram.com. The publishing calls are the same in both.
 */

const FACEBOOK_GRAPH_HOST = 'https://graph.facebook.com';

const INSTAGRAM_GRAPH_HOST = 'https://graph.instagram.com';

type TokenKind = 'unified' | 'instagram-login';

/* The Graph API version calls go to, unless INSTAGRAM_GRAPH_API_VERSION says
 * otherwise. v27.0 came out on 4 November 2026, and Meta keeps a version
 * working for at least two years. */
const DEFAULT_API_VERSION = 'v27.0';

const REQUEST_TIMEOUT_MS = 30_000;

/* A container is checked this often until Instagram has fetched its
 * picture, which takes seconds; after two minutes the post is given up. */
const STATUS_CHECK_INTERVAL_MS = 3_000;

const MAX_STATUS_CHECKS = 40;

/* An Instagram Login token renewed by the API. Railway's variable keeps the
 * token it was set to, so the renewed one has to live somewhere the API can
 * write. */
const TOKEN_KEY = 'instagram-posts:token';

/* An Instagram Login token lasts 60 days from its last renewal. */
const TOKEN_TTL_SECONDS = 60 * 24 * 60 * 60;

/* A token can be renewed once it is a day old; once a week leaves weeks to
 * spare. */
const RENEW_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/* Error codes for an access token that is expired, revoked or lacks a
 * permission. */
const TOKEN_ERROR_CODES = new Set([190]);
const TOKEN_ERROR_SUBCODES = new Set([2207005, 2207006]);

export interface CarouselSlide {
  /** A public JPEG, which Instagram downloads. */
  imageUrl: string;
  /** Accounts tagged on the slide, at x and y between 0 and 1. */
  userTags: { username: string; x: number; y: number }[];
}

export type PublishResult =
  | { status: 'published'; mediaId: string; permalink: string | null }
  /** Nothing went out. */
  | { status: 'failed'; error: string }
  /** media_publish got no clear answer: the post may have gone out. */
  | { status: 'unknown'; error: string };

export type TokenRenewal =
  | 'renewed'
  | 'not-due'
  /** A Unified login token, which doesn't expire. */
  | 'never-expires'
  | 'failed'
  | 'not-configured';

interface StoredToken {
  token: string;
  /** The hash of the INSTAGRAM_ACCESS_TOKEN it was renewed from. */
  source: string;
  renewedAt: string;
}

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
  };
}

/** What the API answered, without the request: its URL and body hold the token. */
export class InstagramApiError extends Error {
  constructor(
    message: string,
    /**
     * Instagram refused the request (a 4xx answer), so it changed nothing.
     * False for a server error, a timeout or no connection.
     */
    readonly refused: boolean,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
  }
}

@Injectable()
export class InstagramGraphService {
  private readonly logger = new Logger(InstagramGraphService.name);

  /** The account's id from GET /me, once read. */
  private accountId: string | null = null;

  constructor(private readonly redisService: RedisService) {}

  /** Whether INSTAGRAM_ACCESS_TOKEN is set. */
  isConfigured(): boolean {
    return configuredToken() !== null;
  }

  /**
   * Publishes a carousel: a container for each slide, one for the carousel,
   * then media_publish, which is the only call that puts anything on the
   * account.
   */
  async publishCarousel(
    slides: CarouselSlide[],
    caption: string,
  ): Promise<PublishResult> {
    const token = await this.currentToken();
    if (!token) {
      return { status: 'failed', error: 'INSTAGRAM_ACCESS_TOKEN is not set' };
    }

    let accountId: string;
    let carouselId: string;
    try {
      accountId = await this.account(token);
      const children: string[] = [];
      for (const slide of slides) {
        children.push(await this.createSlideContainer(accountId, slide, token));
      }
      for (const child of children) await this.waitUntilReady(child, token);

      carouselId = await this.createContainer(
        accountId,
        { media_type: 'CAROUSEL', children: children.join(','), caption },
        token,
      );
      await this.waitUntilReady(carouselId, token);
    } catch (error) {
      return { status: 'failed', error: describe(error) };
    }

    let mediaId: string;
    try {
      const published = await this.post<{ id?: string }>(
        `/${accountId}/media_publish`,
        { creation_id: carouselId },
        token,
      );
      if (!published.id)
        throw new Error('media_publish answered without an id');
      mediaId = String(published.id);
    } catch (error) {
      const refused = error instanceof InstagramApiError && error.refused;
      return { status: refused ? 'failed' : 'unknown', error: describe(error) };
    }

    const permalink = await this.get<{ permalink?: string }>(
      `/${mediaId}`,
      { fields: 'permalink' },
      token,
    )
      .then((media) => media.permalink ?? null)
      .catch(() => null);
    return { status: 'published', mediaId, permalink };
  }

  /**
   * Renews an Instagram Login token when its last renewal is a week old, and
   * keeps the new one in Redis. A failed renewal is tried again next run.
   * Unified login tokens never expire, so they are left as they are.
   */
  async renewTokenIfDue(now = new Date()): Promise<TokenRenewal> {
    const configured = configuredToken();
    if (!configured) return 'not-configured';
    if (tokenKind(configured) === 'unified') return 'never-expires';

    const stored = await this.storedToken(configured);
    if (
      stored &&
      now.getTime() - Date.parse(stored.renewedAt) < RENEW_AFTER_MS
    ) {
      return 'not-due';
    }

    try {
      const { data } = await axios.get<{ access_token?: unknown }>(
        `${INSTAGRAM_GRAPH_HOST}/refresh_access_token`,
        {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: stored?.token ?? configured,
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );
      if (typeof data.access_token !== 'string' || !data.access_token) {
        throw new Error('The answer had no access_token');
      }
      const renewed: StoredToken = {
        token: data.access_token,
        source: fingerprint(configured),
        renewedAt: now.toISOString(),
      };
      await this.redisService.set(TOKEN_KEY, renewed, TOKEN_TTL_SECONDS);
      return 'renewed';
    } catch (error) {
      this.logger.warn(`Instagram token renewal failed: ${describe(error)}`);
      return 'failed';
    }
  }

  /** The newest token: the one renewed in Redis, else INSTAGRAM_ACCESS_TOKEN. */
  private async currentToken(): Promise<string | null> {
    const configured = configuredToken();
    if (!configured) return null;
    return (await this.storedToken(configured))?.token ?? configured;
  }

  /* The renewed token, unless INSTAGRAM_ACCESS_TOKEN has changed since: a
   * new token set on Railway replaces it. */
  private async storedToken(configured: string): Promise<StoredToken | null> {
    const stored = await this.redisService.get<StoredToken>(TOKEN_KEY);
    return stored?.source === fingerprint(configured) ? stored : null;
  }

  /* The professional account's id: INSTAGRAM_USER_ID, or else the account
   * the token is for. With Unified login /me is the business's system user,
   * so the account comes from /me/assigned_instagram_accounts; with
   * Instagram Login it is /me's user_id. */
  private async account(token: string): Promise<string> {
    const configured = process.env.INSTAGRAM_USER_ID?.trim();
    if (configured) return configured;
    if (this.accountId) return this.accountId;

    let id: string | number | undefined;
    if (tokenKind(token) === 'unified') {
      const assigned = await this.get<{ data?: { id?: string | number }[] }>(
        '/me/assigned_instagram_accounts',
        {},
        token,
      );
      id = assigned.data?.[0]?.id;
    } else {
      const me = await this.get<{
        user_id?: string | number;
        data?: { user_id?: string | number }[];
      }>('/me', { fields: 'user_id,username' }, token);
      id = me.user_id ?? me.data?.[0]?.user_id;
    }
    if (id === undefined) {
      throw new Error(
        'No Instagram account came with the token; set INSTAGRAM_USER_ID',
      );
    }
    this.accountId = String(id);
    return this.accountId;
  }

  /* A slide's container. Instagram's docs don't say whether a carousel's
   * slides take user tags, so a slide whose tags are refused goes untagged. */
  private async createSlideContainer(
    accountId: string,
    slide: CarouselSlide,
    token: string,
  ): Promise<string> {
    const params = { image_url: slide.imageUrl, is_carousel_item: 'true' };
    if (slide.userTags.length > 0) {
      try {
        return await this.createContainer(
          accountId,
          { ...params, user_tags: JSON.stringify(slide.userTags) },
          token,
        );
      } catch (error) {
        if (!(error instanceof InstagramApiError) || !error.refused)
          throw error;
        this.logger.warn(
          `Instagram refused a slide's tags; it goes untagged: ${describe(error)}`,
        );
      }
    }
    return this.createContainer(accountId, params, token);
  }

  private async createContainer(
    accountId: string,
    params: Record<string, string>,
    token: string,
  ): Promise<string> {
    const container = await this.post<{ id?: string }>(
      `/${accountId}/media`,
      params,
      token,
    );
    if (!container.id) throw new Error('A container was made without an id');
    return String(container.id);
  }

  /* Waits until Instagram has fetched and processed a container's media. */
  private async waitUntilReady(
    containerId: string,
    token: string,
  ): Promise<void> {
    for (let check = 1; check <= MAX_STATUS_CHECKS; check++) {
      const container = await this.get<{
        status_code?: string;
        status?: string;
      }>(`/${containerId}`, { fields: 'status_code,status' }, token);
      if (container.status_code === 'FINISHED') return;
      if (
        container.status_code === 'ERROR' ||
        container.status_code === 'EXPIRED'
      ) {
        throw new Error(
          `Container ${containerId} is ${container.status_code} (${container.status ?? 'no detail'})`,
        );
      }
      if (check < MAX_STATUS_CHECKS) await this.sleep(STATUS_CHECK_INTERVAL_MS);
    }
    throw new Error(`Container ${containerId} wasn't ready after two minutes`);
  }

  /* Waits between status checks; the specs replace it. */
  private sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

  private get<T>(
    path: string,
    params: Record<string, string>,
    token: string,
  ): Promise<T> {
    return request(() =>
      axios.get<T>(graphUrl(path, token), {
        params: { ...params, access_token: token },
        timeout: REQUEST_TIMEOUT_MS,
      }),
    );
  }

  private post<T>(
    path: string,
    params: Record<string, string>,
    token: string,
  ): Promise<T> {
    return request(() =>
      axios.post<T>(
        graphUrl(path, token),
        new URLSearchParams({ ...params, access_token: token }),
        { timeout: REQUEST_TIMEOUT_MS },
      ),
    );
  }
}

async function request<T>(send: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    return (await send()).data;
  } catch (error) {
    throw toApiError(error);
  }
}

/* Instagram Login tokens start with IG; Unified login's, like every
 * Facebook token, with EAA. */
function tokenKind(token: string): TokenKind {
  return token.startsWith('IG') ? 'instagram-login' : 'unified';
}

function graphUrl(path: string, token: string): string {
  const host =
    tokenKind(token) === 'unified' ? FACEBOOK_GRAPH_HOST : INSTAGRAM_GRAPH_HOST;
  const version =
    process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || DEFAULT_API_VERSION;
  return `${host}/${version}${path}`;
}

function configuredToken(): string | null {
  return process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
}

/* A token's hash, to recognise it without keeping it twice. */
function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

function toApiError(error: unknown): InstagramApiError {
  if (error instanceof InstagramApiError) return error;
  if (!axios.isAxiosError(error)) {
    return new InstagramApiError(
      error instanceof Error ? error.message : String(error),
      false,
    );
  }
  const status = error.response?.status;
  const body = (error.response?.data as GraphErrorBody | undefined)?.error;
  const message = body?.message
    ? body.error_user_msg
      ? `${body.message} (${body.error_user_msg})`
      : body.message
    : status
      ? `HTTP ${status}`
      : (error.code ?? 'no answer');
  return new InstagramApiError(
    message,
    status !== undefined && status < 500,
    body?.code,
    body?.error_subcode,
  );
}

/* An error for the logs and the run's result, never with the token. */
function describe(error: unknown): string {
  const apiError = toApiError(error);
  const codes = [apiError.code, apiError.subcode]
    .filter((code) => code !== undefined)
    .join('/');
  const tokenProblem =
    (apiError.code !== undefined && TOKEN_ERROR_CODES.has(apiError.code)) ||
    (apiError.subcode !== undefined &&
      TOKEN_ERROR_SUBCODES.has(apiError.subcode));
  return [
    apiError.message,
    codes && `[${codes}]`,
    tokenProblem &&
      '- the access token is expired or lacks a permission: set a new INSTAGRAM_ACCESS_TOKEN (docs/instagram-posts.md)',
  ]
    .filter(Boolean)
    .join(' ');
}
