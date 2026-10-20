import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseService } from '../supabase/supabase.service';
import { MatchesService } from './matches.service';

type ScriptedResult = { data: unknown; error: unknown };
type ScriptMap = Record<string, ScriptedResult[]>;

function createServiceWithScript(script: ScriptMap) {
  const consume = (key: string): Promise<ScriptedResult> => {
    const queue = script[key] ?? [];
    if (queue.length === 0) {
      return Promise.resolve({ data: null, error: null });
    }
    const next = queue.shift() as ScriptedResult;
    return Promise.resolve(next);
  };

  const queryByTable = new Map<string, Record<string, jest.Mock>>();

  const getQuery = (table: string) => {
    const existing = queryByTable.get(table);
    if (existing) return existing;

    const query: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => consume(`${table}.maybeSingle`)),
      single: jest.fn(async () => consume(`${table}.single`)),
      upsert: jest.fn(async () => consume(`${table}.upsert`)),
    };

    queryByTable.set(table, query);
    return query;
  };

  const rpc = jest.fn(async (fn: string) => consume(`rpc.${fn}`));
  const db = {
    from: jest.fn((table: string) => getQuery(table)),
    rpc,
  };

  const supabaseService = {
    getClient: () => db,
  } as unknown as SupabaseService;

  return {
    service: new MatchesService(supabaseService),
    rpc,
  };
}

describe('MatchesService submitSwipeDecision', () => {
  const baseSwipe = {
    other_user_id: 'other-user',
    event_id: 'f5f8b2e0-bfcf-4a77-90b7-e7631f38a101',
    liked: true,
    gender_filter: 'everyone' as const,
    age_min: 18,
    age_max: 60,
    selected_interests: [],
  };

  function attendingScript(): ScriptMap {
    return {
      'event_sessions.maybeSingle': [
        { data: { id: 1 }, error: null },
        { data: { id: 2 }, error: null },
      ],
      'tickets.maybeSingle': [{ data: null, error: null }],
    };
  }

  it('rejects likes when backend limit decision disallows it', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: false,
            was_already_liked: false,
            likes_used: 4,
            like_limit: 4,
            eligible_guest_count: 20,
            limit_reached: true,
          },
          error: null,
        },
      ],
    };

    const { service } = createServiceWithScript(script);

    const error = await service
      .submitSwipeDecision('me-user', baseSwipe)
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      message: 'Like limit reached for current eligible guests',
      likes_used: 4,
      like_limit: 4,
      eligible_guest_count: 20,
    });
  });

  it('rejects a pass that would withdraw an earlier like', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: false,
            was_already_liked: true,
            likes_used: 3,
            like_limit: 3,
            eligible_guest_count: 10,
            limit_reached: true,
          },
          error: null,
        },
      ],
    };

    const { service, rpc } = createServiceWithScript(script);

    const error = await service
      .submitSwipeDecision('me-user', { ...baseSwipe, liked: false })
      .catch((err: unknown) => err);

    expect(rpc).toHaveBeenCalledWith(
      'submit_guest_swipe_with_limit',
      expect.objectContaining({ p_liked: false }),
    );
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      message: 'A like cannot be changed to a pass',
      likes_used: 3,
      like_limit: 3,
      eligible_guest_count: 10,
    });
  });

  it('records a pass on a guest that was not liked', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: true,
            was_already_liked: false,
            likes_used: 3,
            like_limit: 3,
            eligible_guest_count: 10,
            limit_reached: true,
          },
          error: null,
        },
      ],
    };

    const { service } = createServiceWithScript(script);

    await expect(
      service.submitSwipeDecision('me-user', { ...baseSwipe, liked: false }),
    ).resolves.toEqual({
      matched: false,
      match_id: null,
      was_already_liked: false,
      likes_used: 3,
      like_limit: 3,
      eligible_guest_count: 10,
      limit_reached: true,
    });
  });

  it('passes the other gender filter to the atomic like-limit decision', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: true,
            was_already_liked: false,
            likes_used: 1,
            like_limit: 3,
            eligible_guest_count: 10,
            limit_reached: false,
          },
          error: null,
        },
      ],
      'guest_swipes.maybeSingle': [{ data: null, error: null }],
    };

    const { service, rpc } = createServiceWithScript(script);

    await service.submitSwipeDecision('me-user', {
      ...baseSwipe,
      gender_filter: 'other',
    });

    expect(rpc).toHaveBeenCalledWith(
      'submit_guest_swipe_with_limit',
      expect.objectContaining({ p_gender_filter: 'other' }),
    );
  });

  it('returns non-match snapshot when reciprocal like does not exist', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: true,
            was_already_liked: false,
            likes_used: 2,
            like_limit: 4,
            eligible_guest_count: 20,
            limit_reached: false,
          },
          error: null,
        },
      ],
      'guest_swipes.maybeSingle': [{ data: null, error: null }],
    };

    const { service } = createServiceWithScript(script);

    await expect(
      service.submitSwipeDecision('me-user', baseSwipe),
    ).resolves.toEqual({
      matched: false,
      match_id: null,
      was_already_liked: false,
      likes_used: 2,
      like_limit: 4,
      eligible_guest_count: 20,
      limit_reached: false,
    });
  });

  it('returns existing match id when reciprocal like exists and match is present', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: true,
            was_already_liked: true,
            likes_used: 3,
            like_limit: 4,
            eligible_guest_count: 20,
            limit_reached: false,
          },
          error: null,
        },
      ],
      'guest_swipes.maybeSingle': [{ data: { id: 10 }, error: null }],
      'matches.maybeSingle': [{ data: { id: 55 }, error: null }],
    };

    const { service } = createServiceWithScript(script);

    await expect(
      service.submitSwipeDecision('me-user', baseSwipe),
    ).resolves.toEqual({
      matched: true,
      match_id: 55,
      was_already_liked: true,
      likes_used: 3,
      like_limit: 4,
      eligible_guest_count: 20,
      limit_reached: false,
    });
  });

  it('handles concurrent match creation unique-violation race', async () => {
    const script = {
      ...attendingScript(),
      'rpc.submit_guest_swipe_with_limit': [
        {
          data: {
            allowed: true,
            was_already_liked: false,
            likes_used: 1,
            like_limit: 3,
            eligible_guest_count: 10,
            limit_reached: false,
          },
          error: null,
        },
      ],
      'guest_swipes.maybeSingle': [{ data: { id: 9 }, error: null }],
      'matches.maybeSingle': [{ data: null, error: null }],
      'matches.single': [
        { data: null, error: { code: '23505' } },
        { data: { id: 72 }, error: null },
      ],
    };

    const { service } = createServiceWithScript(script);

    await expect(
      service.submitSwipeDecision('me-user', baseSwipe),
    ).resolves.toEqual({
      matched: true,
      match_id: 72,
      was_already_liked: false,
      likes_used: 1,
      like_limit: 3,
      eligible_guest_count: 10,
      limit_reached: false,
    });
  });
});

describe('MatchesService getMyMatches', () => {
  const hoursFromNow = (hours: number) =>
    new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  // One of me-user's matches, at an event that is still on, with the chat
  // embedded as given.
  function matchRow(id: number, chats: unknown) {
    return {
      id,
      guest_id_1: 'me-user',
      guest_id_2: `other-${id}`,
      matched_at: hoursFromNow(-1),
      guest1: { user_id: 'me-user', user: { first_name: 'Me' } },
      guest2: { user_id: `other-${id}`, user: { first_name: 'Ana' } },
      event: {
        id: 'event-1',
        title: 'Jazz night',
        end_date_time: hoursFromNow(3),
        venue: null,
      },
      chats,
    };
  }

  // Awaiting the matches query gives these rows, as supabase-js does.
  function createServiceWithRows(rows: unknown[]) {
    const query = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    const supabaseService = {
      getClient: () => ({ from: () => query }),
    } as unknown as SupabaseService;
    return { service: new MatchesService(supabaseService), query };
  }

  const newestMessage = {
    id: '7f9d3c1e-2a4b-4c5d-8e6f-0a1b2c3d4e5f',
    message: 'See you at the bar',
    sender_id: 'other-1',
    sent_at: '2026-10-20T18:30:00+00:00',
  };

  // chats.match_id is unique, so PostgREST sends the chat as one object.
  it('returns the chat and its newest message', async () => {
    const { service } = createServiceWithRows([
      matchRow(1, { id: 'chat-1', chat_messages: [newestMessage] }),
    ]);

    const [match] = await service.getMyMatches('me-user');

    expect(match).toMatchObject({
      id: 1,
      chat_id: 'chat-1',
      has_messages: true,
      last_message: {
        id: '7f9d3c1e-2a4b-4c5d-8e6f-0a1b2c3d4e5f',
        text: 'See you at the bar',
        sender_id: 'other-1',
        sent_at: '2026-10-20T18:30:00+00:00',
      },
    });
  });

  it('returns the chat id and no message for a chat with no messages', async () => {
    const { service } = createServiceWithRows([
      matchRow(2, { id: 'chat-2', chat_messages: [] }),
    ]);

    const [match] = await service.getMyMatches('me-user');

    expect(match).toMatchObject({
      chat_id: 'chat-2',
      has_messages: false,
      last_message: null,
    });
  });

  it('returns no chat for a match without one', async () => {
    const { service } = createServiceWithRows([matchRow(3, null)]);

    const [match] = await service.getMyMatches('me-user');

    expect(match).toMatchObject({
      chat_id: null,
      has_messages: false,
      last_message: null,
    });
  });

  it('also reads a chat embedded as an array', async () => {
    const { service } = createServiceWithRows([
      matchRow(4, [{ id: 'chat-4', chat_messages: [newestMessage] }]),
    ]);

    const [match] = await service.getMyMatches('me-user');

    expect(match).toMatchObject({
      chat_id: 'chat-4',
      has_messages: true,
      last_message: { text: 'See you at the bar' },
    });
  });

  it("reads only each chat's newest message", async () => {
    const { service, query } = createServiceWithRows([]);

    await service.getMyMatches('me-user');

    expect(query.order).toHaveBeenCalledWith('sent_at', {
      referencedTable: 'chats.chat_messages',
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(1, {
      referencedTable: 'chats.chat_messages',
    });
  });
});
