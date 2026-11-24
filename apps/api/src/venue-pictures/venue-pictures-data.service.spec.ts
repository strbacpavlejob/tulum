/**
 * The requests VenuePicturesDataService sends to PostgREST. A real
 * supabase-js client talks to a stubbed fetch, so the filters checked are
 * the ones Supabase receives; nothing reaches it.
 */
import { describe, expect, it } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { VenuePicturesDataService } from './venue-pictures-data.service';

interface Call {
  method: string;
  table: string;
  params: URLSearchParams;
  body: unknown;
}

const VENUE = '7a1b2c3d-4e5f-4a6b-9c7d-8e9f0a1b2c3d';
const CONTACT = '0b6c3f0e-5f8e-4a3e-9d7a-1c2b3d4e5f60';

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
  const service = new VenuePicturesDataService({
    getClient: () => client,
  } as unknown as SupabaseService);
  return { service, calls };
}

describe('VenuePicturesDataService', () => {
  it('reads the imported venues whose picture is missing or empty', async () => {
    const { service, calls } = setup({
      'GET venues': [
        [
          {
            id: VENUE,
            name: 'Lasta Club',
            latitude: 44.8,
            longitude: 20.44,
            scraper: 'eventzeka',
            contact_id: CONTACT,
            venue_contacts: { instagram_handle: '@LastaClub' },
          },
          {
            id: 'b',
            name: 'Jelica',
            latitude: 44.81,
            longitude: 20.45,
            scraper: 'guest_list',
            contact_id: null,
            venue_contacts: null,
          },
        ],
      ],
    });

    await expect(service.fetchScrapedVenuesWithoutPicture()).resolves.toEqual([
      {
        id: VENUE,
        name: 'Lasta Club',
        latitude: 44.8,
        longitude: 20.44,
        scraper: 'eventzeka',
        contactId: CONTACT,
        instagramHandle: 'lastaclub',
      },
      expect.objectContaining({ id: 'b', instagramHandle: null }),
    ]);

    const [{ params }] = calls;
    expect(params.get('scraper')).toBe('not.is.null');
    expect(params.get('or')).toBe('(picture_url.is.null,picture_url.eq.)');
    expect(params.get('select')).toContain(
      'venue_contacts!venues_contact_id_fkey(instagram_handle)',
    );
  });

  it('only sets a picture on a venue that still has none', async () => {
    const { service, calls } = setup({
      'PATCH venues': [[{ id: VENUE }], []],
    });

    await expect(
      service.setPictureIfMissing(VENUE, 'https://img.tulum-app.com/a.webp'),
    ).resolves.toBe(true);
    await expect(
      service.setPictureIfMissing(VENUE, 'https://img.tulum-app.com/a.webp'),
    ).resolves.toBe(false);

    expect(calls[0].body).toEqual({
      picture_url: 'https://img.tulum-app.com/a.webp',
    });
    expect(calls[0].params.get('id')).toBe(`eq.${VENUE}`);
    expect(calls[0].params.get('or')).toBe(
      '(picture_url.is.null,picture_url.eq.)',
    );
  });

  it("adds a handle to the venue's contact without replacing one", async () => {
    const { service, calls } = setup({ 'PATCH venue_contacts': [[]] });

    await service.saveInstagramHandle(
      { id: VENUE, contactId: CONTACT },
      'lastaclub',
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({
      instagram_handle: 'lastaclub',
      is_instagram: true,
    });
    expect(calls[0].params.get('id')).toBe(`eq.${CONTACT}`);
    expect(calls[0].params.get('or')).toBe(
      '(instagram_handle.is.null,instagram_handle.eq.)',
    );
  });

  it('gives a venue without a contact a new one with the handle', async () => {
    const { service, calls } = setup({
      'POST venue_contacts': [{ id: CONTACT }],
      'PATCH venues': [[{ id: VENUE }]],
    });

    await service.saveInstagramHandle({ id: VENUE, contactId: null }, 'jelica');

    expect(calls.map((call) => `${call.method} ${call.table}`)).toEqual([
      'POST venue_contacts',
      'PATCH venues',
    ]);
    expect(calls[0].body).toEqual({
      phone_number: '',
      is_instagram: true,
      instagram_handle: 'jelica',
    });
    expect(calls[1].body).toEqual({ contact_id: CONTACT });
    expect(calls[1].params.get('contact_id')).toBe('is.null');
  });

  it('removes the new contact when the venue got one meanwhile', async () => {
    const { service, calls } = setup({
      'POST venue_contacts': [{ id: CONTACT }],
      'PATCH venues': [[]],
    });

    await service.saveInstagramHandle({ id: VENUE, contactId: null }, 'jelica');

    expect(calls.map((call) => `${call.method} ${call.table}`)).toEqual([
      'POST venue_contacts',
      'PATCH venues',
      'DELETE venue_contacts',
    ]);
    expect(calls[2].params.get('id')).toBe(`eq.${CONTACT}`);
  });
});
