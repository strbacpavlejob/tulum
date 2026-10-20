import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { SupabaseService } from '../supabase/supabase.service';
import { ChatsService } from './chats.service';

type ScriptedResult = { data: unknown; error: unknown };
type ScriptMap = Record<string, ScriptedResult[]>;

const CALLER = 'user_caller';
const OTHER = 'user_other';
const CHAT_ID = '0b6c3f0e-5f8e-4a3e-9d7a-1c2b3d4e5f60';
const MESSAGE_ID = '5a1f2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';

// Each table returns its scripted results in order, keyed by the method that
// ends the query (e.g. 'matches.maybeSingle').
function createServiceWithScript(script: ScriptMap) {
  const consume = (key: string): Promise<ScriptedResult> =>
    Promise.resolve(script[key]?.shift() ?? { data: null, error: null });

  const queries = new Map<string, Record<string, jest.Mock>>();
  const from = jest.fn((table: string) => {
    const existing = queries.get(table);
    if (existing) return existing;
    const query: Record<string, jest.Mock> = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(() => consume(`${table}.maybeSingle`)),
      single: jest.fn(() => consume(`${table}.single`)),
    };
    queries.set(table, query);
    return query;
  });

  const supabaseService = {
    getClient: () => ({ from }),
  } as unknown as SupabaseService;

  return { service: new ChatsService(supabaseService), from, queries };
}

const match = (guestId1: string, guestId2: string) => ({
  data: { guest_id_1: guestId1, guest_id_2: guestId2 },
  error: null,
});
const chat = { id: CHAT_ID, match_id: 7 };

describe('ChatsService.assertMatchParticipant', () => {
  it('accepts either guest of the match', async () => {
    const { service } = createServiceWithScript({
      'matches.maybeSingle': [match(CALLER, OTHER), match(OTHER, CALLER)],
    });

    await expect(
      service.assertMatchParticipant(7, CALLER),
    ).resolves.toBeUndefined();
    await expect(
      service.assertMatchParticipant(7, CALLER),
    ).resolves.toBeUndefined();
  });

  it('reports someone else’s match as not found', async () => {
    const { service } = createServiceWithScript({
      'matches.maybeSingle': [match(OTHER, 'user_third')],
    });

    await expect(
      service.assertMatchParticipant(7, CALLER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('reports a missing match as not found', async () => {
    const { service } = createServiceWithScript({});

    await expect(
      service.assertMatchParticipant(7, CALLER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('passes database errors through instead of answering 404', async () => {
    const dbError = { code: '57014', message: 'canceling statement' };
    const { service } = createServiceWithScript({
      'matches.maybeSingle': [{ data: null, error: dbError }],
    });

    await expect(service.assertMatchParticipant(7, CALLER)).rejects.toBe(
      dbError,
    );
  });
});

describe('ChatsService.getChatForParticipant', () => {
  it('returns the chat to a guest of its match', async () => {
    const { service } = createServiceWithScript({
      'chats.maybeSingle': [{ data: chat, error: null }],
      'matches.maybeSingle': [match(OTHER, CALLER)],
    });

    await expect(service.getChatForParticipant(CHAT_ID, CALLER)).resolves.toBe(
      chat,
    );
  });

  it('hides a chat from anyone outside its match', async () => {
    const { service } = createServiceWithScript({
      'chats.maybeSingle': [{ data: chat, error: null }],
      'matches.maybeSingle': [match(OTHER, 'user_third')],
    });

    await expect(
      service.getChatForParticipant(CHAT_ID, CALLER),
    ).rejects.toThrow('Chat not found');
  });

  it('reports a missing chat without looking up a match', async () => {
    const { service, from } = createServiceWithScript({});

    await expect(
      service.getChatForParticipant(CHAT_ID, CALLER),
    ).rejects.toThrow('Chat not found');
    expect(from).not.toHaveBeenCalledWith('matches');
  });
});

describe('ChatsService.markMessageRead', () => {
  it('marks a message in one of the caller’s chats as read', async () => {
    const updated = { id: MESSAGE_ID, is_read: true };
    const { service, queries } = createServiceWithScript({
      'chat_messages.maybeSingle': [
        { data: { chat_id: CHAT_ID }, error: null },
      ],
      'chats.maybeSingle': [{ data: chat, error: null }],
      'matches.maybeSingle': [match(CALLER, OTHER)],
      'chat_messages.single': [{ data: updated, error: null }],
    });

    await expect(service.markMessageRead(MESSAGE_ID, CALLER)).resolves.toBe(
      updated,
    );
    expect(queries.get('chat_messages')?.update).toHaveBeenCalledWith({
      is_read: true,
    });
  });

  it('does not touch a message in someone else’s chat', async () => {
    const { service, queries } = createServiceWithScript({
      'chat_messages.maybeSingle': [
        { data: { chat_id: CHAT_ID }, error: null },
      ],
      'chats.maybeSingle': [{ data: chat, error: null }],
      'matches.maybeSingle': [match(OTHER, 'user_third')],
    });

    await expect(service.markMessageRead(MESSAGE_ID, CALLER)).rejects.toThrow(
      'Message not found',
    );
    expect(queries.get('chat_messages')?.update).not.toHaveBeenCalled();
  });

  it('reports a missing message as not found', async () => {
    const { service } = createServiceWithScript({});

    await expect(service.markMessageRead(MESSAGE_ID, CALLER)).rejects.toThrow(
      'Message not found',
    );
  });
});
