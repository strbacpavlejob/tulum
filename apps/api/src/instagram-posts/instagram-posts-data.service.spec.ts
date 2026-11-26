/**
 * The requests InstagramPostsDataService sends to PostgREST and how it reads
 * the rows. A real supabase-js client talks to a stubbed fetch, so nothing
 * reaches Supabase.
 */
import { describe, expect, it } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { InstagramPostsDataService } from './instagram-posts-data.service';

interface Call {
  method: string;
  table: string;
  params: URLSearchParams;
}

const FROM = new Date('2026-11-26T17:05:00.000Z');
const UNTIL = new Date('2026-11-29T23:00:00.000Z');

function row(
  id: string,
  venueType: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    title: `Event ${id}`,
    picture_url: `https://img.tulum-app.com/event-images/${id}.webp`,
    // As supabase-js returns a timestamp without time zone: no offset.
    start_date_time: '2026-11-27T19:00:00',
    venues: {
      id: `venue-${id}`,
      name: `Venue ${id}`,
      venue_type: venueType,
      picture_url: null,
      venue_contacts: { instagram_handle: '@kptm.bar' },
    },
    ...overrides,
  };
}

function setup(events: unknown[]) {
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
    calls.push({ method, table, params: url.searchParams });
    const reply = method === 'GET' && table === 'events' ? events : [];
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
  const service = new InstagramPostsDataService({
    getClient: () => client,
  } as unknown as SupabaseService);
  return { service, calls };
}

describe('InstagramPostsDataService', () => {
  it("asks for active events at imported venues in the post's window", async () => {
    const { service, calls } = setup([]);

    await service.fetchEvents(FROM, UNTIL);

    const params = calls[0].params;
    expect(calls[0]).toMatchObject({ method: 'GET', table: 'events' });
    expect(params.get('status')).toBe('eq.active');
    expect(params.getAll('start_date_time')).toEqual([
      'gte.2026-11-26T17:05:00.000Z',
      'lt.2026-11-29T23:00:00.000Z',
    ]);
    expect(params.get('venues.scraper')).toBe('not.is.null');
    expect(params.get('order')).toBe('start_date_time.asc');
  });

  it('reads start times as UTC, whatever the server’s time zone', async () => {
    const { service } = setup([row('e1', 'bar')]);

    const [event] = await service.fetchEvents(FROM, UNTIL);

    // 19:00 UTC, which is 20:00 in Belgrade.
    expect(event.startsAt).toBe('2026-11-27T19:00:00.000Z');
  });

  it('keeps the venue type, its group and Instagram handle', async () => {
    const { service } = setup([row('e1', 'tavern')]);

    await expect(service.fetchEvents(FROM, UNTIL)).resolves.toEqual([
      expect.objectContaining({
        id: 'e1',
        venueType: 'tavern',
        group: 'bars',
        instagramHandle: 'kptm.bar',
        guestCount: 0,
      }),
    ]);
  });

  it('leaves out other venue types and events without a picture', async () => {
    const { service } = setup([
      row('stadium', 'stadium'),
      row('no-picture', 'club', { picture_url: null }),
      row('kept', 'club'),
    ]);

    const events = await service.fetchEvents(FROM, UNTIL);

    expect(events.map((event) => event.id)).toEqual(['kept']);
  });
});
