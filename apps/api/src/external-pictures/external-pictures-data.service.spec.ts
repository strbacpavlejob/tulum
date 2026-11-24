/**
 * The requests ExternalPicturesDataService sends to PostgREST. A real
 * supabase-js client talks to a stubbed fetch, so the filters checked are
 * the ones Supabase receives; nothing reaches it.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { ExternalPicturesDataService } from './external-pictures-data.service';

interface Call {
  method: string;
  table: string;
  params: URLSearchParams;
  body: unknown;
}

const R2 = 'https://img.tulum-app.com';
const EVENT = '5c2d7e1a-9b3f-4e6a-8d1c-2f4b6a8c0e12';

/** replies: what each "METHOD table" answers, in order; [] when it runs out. */
function setup(replies: Record<string, unknown[]>) {
  const calls: Call[] = [];
  const fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const method = init?.method ?? 'GET';
    const table = url.pathname.split('/').pop() ?? '';
    calls.push({
      method,
      table,
      params: url.searchParams,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const reply = replies[`${method} ${table}`]?.shift() ?? [];
    return Promise.resolve(
      new Response(JSON.stringify(reply), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  };

  const client = createClient('https://project.supabase.co', 'service-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch },
  });
  const service = new ExternalPicturesDataService({
    getClient: () => client,
  } as unknown as SupabaseService);
  return { service, calls };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ExternalPicturesDataService', () => {
  it('reads the events and venues whose picture is outside the bucket', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.parse('2026-11-24T12:00:00.000Z'));
    const { service, calls } = setup({
      'GET events': [
        [
          {
            id: EVENT,
            picture_url: 'https://eventzeka.com/api/discover/images/1',
            // UTC without an offset, as the column returns it.
            end_date_time: '2026-11-24T20:00:00',
          },
          {
            id: 'ended',
            picture_url: 'https://assets.tickets.rs/poster.jpg',
            end_date_time: '2026-11-24T11:00:00',
          },
        ],
      ],
      'GET venues': [
        [{ id: 'v1', picture_url: 'https://framerusercontent.com/v1.jpg' }],
      ],
    });

    await expect(service.fetchExternalPictures(R2)).resolves.toEqual([
      {
        table: 'events',
        id: EVENT,
        pictureUrl: 'https://eventzeka.com/api/discover/images/1',
        upcoming: true,
      },
      {
        table: 'events',
        id: 'ended',
        pictureUrl: 'https://assets.tickets.rs/poster.jpg',
        upcoming: false,
      },
      {
        table: 'venues',
        id: 'v1',
        pictureUrl: 'https://framerusercontent.com/v1.jpg',
        upcoming: false,
      },
    ]);

    for (const table of ['events', 'venues']) {
      const call = calls.find((c) => c.table === table)!;
      expect(call.params.getAll('picture_url')).toEqual([
        'not.is.null',
        'neq.',
        `not.like.${R2}/%`,
      ]);
    }
  });

  it('replaces a picture only while the row still has the old one', async () => {
    const { service, calls } = setup({
      'PATCH events': [[{ id: EVENT }], []],
    });
    const stored = `${R2}/event-images/scraped/${EVENT}/picture.webp`;

    await expect(
      service.replacePicture(
        'events',
        EVENT,
        'https://assets.tickets.rs/poster.jpg',
        stored,
      ),
    ).resolves.toBe(true);
    await expect(
      service.replacePicture(
        'events',
        EVENT,
        'https://assets.tickets.rs/poster.jpg',
        null,
      ),
    ).resolves.toBe(false);

    expect(calls[0].body).toEqual({ picture_url: stored });
    expect(calls[0].params.get('id')).toBe(`eq.${EVENT}`);
    expect(calls[0].params.get('picture_url')).toBe(
      'eq.https://assets.tickets.rs/poster.jpg',
    );
    expect(calls[1].body).toEqual({ picture_url: null });
  });

  it("reads a row's picture now, and undefined for a row that is gone", async () => {
    const { service } = setup({
      // PostgREST answers a list, which maybeSingle reads as a row or null.
      'GET venues': [[{ picture_url: `${R2}/venue-images/v1.webp` }], []],
    });

    await expect(service.currentPicture('venues', 'v1')).resolves.toBe(
      `${R2}/venue-images/v1.webp`,
    );
    await expect(service.currentPicture('venues', 'gone')).resolves.toBe(
      undefined,
    );
  });
});
