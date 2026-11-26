/**
 * The requests PublicationHistoryService sends to PostgREST and how it reads
 * the answers. A real supabase-js client talks to a stubbed fetch, so
 * nothing reaches Supabase.
 */
import { describe, expect, it } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import {
  PublicationHistoryMissingError,
  PublicationHistoryService,
} from './publication-history.service';

interface Call {
  method: string;
  table: string;
  params: URLSearchParams;
  headers: Headers;
  body: unknown;
}

interface Reply {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

const FROM = new Date('2026-11-27T10:00:00.000Z');
const UNTIL = new Date('2026-11-29T09:00:00.000Z');
const RUN_KEY = 'story:2026-11-27T10:00:mih3k2';

const MISSING_TABLE: Reply = {
  status: 404,
  body: {
    code: 'PGRST205',
    message:
      "Could not find the table 'public.social_media_publications' in the schema cache",
  },
};

/* Answers each request with the next reply, or an empty list. */
function setup(replies: Reply[] = []) {
  const calls: Call[] = [];
  const fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    calls.push({
      method: init?.method ?? 'GET',
      table: url.pathname.split('/').pop() ?? '',
      params: url.searchParams,
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const reply = replies.shift() ?? {};
    return Promise.resolve(
      new Response(
        init?.method === 'HEAD' ? null : JSON.stringify(reply.body ?? []),
        {
          status: reply.status ?? 200,
          headers: { 'Content-Type': 'application/json', ...reply.headers },
        },
      ),
    );
  };

  const client = createClient('https://project.supabase.co', 'service-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch },
  });
  const service = new PublicationHistoryService({
    getClient: () => client,
  } as unknown as SupabaseService);
  // No waiting between a write's tries.
  Object.assign(service, { sleep: () => Promise.resolve() });
  return { service, calls };
}

const ROW = {
  event_id: 'e1',
  format: 'story',
  status: 'published',
  run_key: RUN_KEY,
  created_at: '2026-11-27T09:01:00+00:00',
  events: { title: 'Jazz night', venue_id: 'v1' },
};

describe('PublicationHistoryService', () => {
  it('reads the promoted events that start in a window', async () => {
    const { service, calls } = setup([{ body: [ROW] }]);

    await expect(service.promotedEvents(FROM, UNTIL)).resolves.toEqual([
      {
        eventId: 'e1',
        title: 'Jazz night',
        venueId: 'v1',
        format: 'story',
        status: 'published',
        runKey: RUN_KEY,
        createdAt: '2026-11-27T09:01:00+00:00',
      },
    ]);
    const { method, table, params } = calls[0];
    expect({ method, table }).toEqual({
      method: 'GET',
      table: 'social_media_publications',
    });
    expect(params.get('select')).toContain('events!inner(title,venue_id)');
    expect(params.get('platform')).toBe('eq.instagram');
    expect(params.getAll('events.start_date_time')).toEqual([
      'gte.2026-11-27T10:00:00.000Z',
      'lt.2026-11-29T09:00:00.000Z',
    ]);
  });

  it("reads the last day's stories, newest first", async () => {
    const { service, calls } = setup([{ body: [ROW] }]);

    await service.storiesSince(FROM);

    expect(calls[0].params.get('format')).toBe('eq.story');
    expect(calls[0].params.get('created_at')).toBe(
      'gte.2026-11-27T10:00:00.000Z',
    );
    expect(calls[0].params.get('order')).toBe('created_at.desc');
  });

  it('tells whether a run of a slot got as far as claiming events', async () => {
    const { service, calls } = setup([
      { headers: { 'Content-Range': '*/2' } },
      { headers: { 'Content-Range': '*/0' } },
    ]);

    await expect(service.hasRun('story:2026-11-27T10:00:')).resolves.toBe(true);
    await expect(service.hasRun('story:2026-11-27T15:00:')).resolves.toBe(
      false,
    );
    expect(calls[0].method).toBe('HEAD');
    expect(calls[0].params.get('run_key')).toBe(
      'like.story:2026-11-27T10:00:%',
    );
  });

  it('claims events with one insert that skips those claimed before', async () => {
    const { service, calls } = setup([
      { status: 201, body: [{ event_id: 'e1' }] },
    ]);

    const claimed = await service.claim(['e1', 'e2'], 'story', RUN_KEY);

    // e2 was claimed or promoted already.
    expect(claimed).toEqual(new Set(['e1']));
    const { method, params, headers, body } = calls[0];
    expect(method).toBe('POST');
    expect(params.get('on_conflict')).toBe('event_id,platform');
    expect(headers.get('Prefer')).toContain('resolution=ignore-duplicates');
    expect(headers.get('Prefer')).toContain('return=representation');
    expect(body).toEqual([
      {
        event_id: 'e1',
        platform: 'instagram',
        format: 'story',
        status: 'publishing',
        run_key: RUN_KEY,
      },
      {
        event_id: 'e2',
        platform: 'instagram',
        format: 'story',
        status: 'publishing',
        run_key: RUN_KEY,
      },
    ]);
  });

  it("marks only the run's own claims published, with the media", async () => {
    const { service, calls } = setup();

    await service.markPublished(
      ['e1'],
      RUN_KEY,
      { mediaId: '1789', permalink: 'https://www.instagram.com/stories/x/1/' },
      new Date('2026-11-27T09:02:00Z'),
    );

    const { method, params, body } = calls[0];
    expect(method).toBe('PATCH');
    expect(params.get('run_key')).toBe(`eq.${RUN_KEY}`);
    expect(params.get('status')).toBe('eq.publishing');
    expect(params.get('event_id')).toBe('in.(e1)');
    expect(body).toEqual({
      status: 'published',
      media_id: '1789',
      permalink: 'https://www.instagram.com/stories/x/1/',
      published_at: '2026-11-27T09:02:00.000Z',
    });
  });

  it('keeps a maybe-published claim as unknown, and deletes a failed one', async () => {
    const { service, calls } = setup();

    await service.markUnknown(['e1'], RUN_KEY, 'x'.repeat(2_000));
    await service.release(['e2'], RUN_KEY);

    expect(calls[0].body).toEqual({
      status: 'unknown',
      error: 'x'.repeat(500),
    });
    expect(calls[1].method).toBe('DELETE');
    expect(calls[1].params.get('event_id')).toBe('in.(e2)');
    expect(calls[1].params.get('status')).toBe('eq.publishing');
  });

  it('tries a write again when it fails', async () => {
    const { service, calls } = setup([
      { status: 503, body: { message: 'Service Unavailable' } },
      { status: 503, body: { message: 'Service Unavailable' } },
    ]);

    await service.release(['e1'], RUN_KEY);

    expect(calls).toHaveLength(3);
  });

  it('says when the table is missing: its migration is not applied', async () => {
    const { service, calls } = setup([MISSING_TABLE, MISSING_TABLE]);

    await expect(service.promotedEvents(FROM, UNTIL)).rejects.toBeInstanceOf(
      PublicationHistoryMissingError,
    );
    // Not tried again: the table won't appear between tries.
    await expect(service.release(['e1'], RUN_KEY)).rejects.toBeInstanceOf(
      PublicationHistoryMissingError,
    );
    expect(calls).toHaveLength(2);
  });

  it('asks nothing for no events', async () => {
    const { service, calls } = setup();

    await expect(service.claim([], 'feed', RUN_KEY)).resolves.toEqual(
      new Set(),
    );
    await service.markPublished([], RUN_KEY, { mediaId: '1', permalink: null });
    await service.release([], RUN_KEY);
    expect(calls).toHaveLength(0);
  });
});
