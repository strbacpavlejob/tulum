import { Injectable, NotFoundException } from '@nestjs/common';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { SupabaseService } from '../supabase/supabase.service';

const CHATS_TABLE = 'chats';
const MESSAGES_TABLE = 'chat_messages';

/** A chat_messages row. */
export interface ChatMessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  sent_at: string;
}

@Injectable()
export class ChatsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly guestSafety: GuestSafetyService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  // ── Access checks ─────────────────────────────────────────────────────
  // Only the two guests of a match may open its chat or touch its messages.
  // Someone else's chat, match or message is reported as not found, so ids
  // cannot be probed. A block either way closes the chat for both guests the
  // same way. The chat socket uses these checks too.

  /**
   * The match's other guest, if the user is one of its two guests and
   * neither has blocked the other; otherwise null.
   */
  private async matchPartner(
    matchId: number,
    userId: string,
  ): Promise<string | null> {
    const { data, error } = await this.db
      .from('matches')
      .select('guest_id_1, guest_id_2')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw error;
    if (!data || (data.guest_id_1 !== userId && data.guest_id_2 !== userId)) {
      return null;
    }
    const otherId = (
      data.guest_id_1 === userId ? data.guest_id_2 : data.guest_id_1
    ) as string;
    return (await this.guestSafety.isBlockedBetween(userId, otherId))
      ? null
      : otherId;
  }

  private async isMatchParticipant(matchId: number, userId: string) {
    return (await this.matchPartner(matchId, userId)) !== null;
  }

  async assertMatchParticipant(matchId: number, userId: string) {
    if (!(await this.isMatchParticipant(matchId, userId))) {
      throw new NotFoundException('Match not found');
    }
  }

  /** The chat and the other guest, if the user is one of its match's guests. */
  private async findChatAndPartner(chatId: string, userId: string) {
    const { data: chat, error } = await this.db
      .from(CHATS_TABLE)
      .select('id, match_id, event_id, created_at')
      .eq('id', chatId)
      .maybeSingle();
    if (error) throw error;
    if (!chat) return null;
    const partnerId = await this.matchPartner(chat.match_id as number, userId);
    return partnerId === null ? null : { chat, partnerId };
  }

  private async findChatForParticipant(chatId: string, userId: string) {
    return (await this.findChatAndPartner(chatId, userId))?.chat ?? null;
  }

  /** The chat, if the user is one of its match's guests; otherwise 404. */
  async getChatForParticipant(chatId: string, userId: string) {
    const chat = await this.findChatForParticipant(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  /**
   * The other guest of the chat's match, if the user is one of its guests;
   * otherwise 404, as getChatForParticipant.
   */
  async getChatPartner(chatId: string, userId: string): Promise<string> {
    const found = await this.findChatAndPartner(chatId, userId);
    if (!found) throw new NotFoundException('Chat not found');
    return found.partnerId;
  }

  async getChatByMatchId(matchId: number) {
    const { data, error } = await this.db
      .from(CHATS_TABLE)
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  async getOrCreateChat(matchId: number, eventId?: string) {
    const existing = await this.getChatByMatchId(matchId);
    if (existing) return existing;

    // If eventId wasn't supplied, fetch it from the match row
    let resolvedEventId = eventId;
    if (resolvedEventId == null) {
      const { data: match, error: matchErr } = await this.db
        .from('matches')
        .select('event_id')
        .eq('id', matchId)
        .single();
      if (matchErr) throw matchErr;
      resolvedEventId = match.event_id as string;
    }

    const { data, error } = await this.db
      .from(CHATS_TABLE)
      .insert({ match_id: matchId, event_id: resolvedEventId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async createChat(chat: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(CHATS_TABLE)
      .insert(chat)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteChat(chatId: string) {
    const { error } = await this.db.from(CHATS_TABLE).delete().eq('id', chatId);
    if (error) throw error;
  }

  async getMessages(chatId: string) {
    const { data, error } = await this.db
      .from(MESSAGES_TABLE)
      .select('*')
      .eq('chat_id', chatId)
      .order('sent_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createMessage(
    message: Record<string, unknown>,
  ): Promise<ChatMessageRow> {
    const { data, error } = await this.db
      .from(MESSAGES_TABLE)
      .insert(message)
      .select()
      .single<ChatMessageRow>();
    if (error) throw error;
    return data;
  }

  async markMessageRead(messageId: string, userId: string) {
    const { data: message, error: messageError } = await this.db
      .from(MESSAGES_TABLE)
      .select('chat_id')
      .eq('id', messageId)
      .maybeSingle();
    if (messageError) throw messageError;
    const chatId = message?.chat_id as string | undefined;
    if (!chatId || !(await this.findChatForParticipant(chatId, userId))) {
      throw new NotFoundException('Message not found');
    }

    const { data, error } = await this.db
      .from(MESSAGES_TABLE)
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteMessage(messageId: string) {
    const { error } = await this.db
      .from(MESSAGES_TABLE)
      .delete()
      .eq('id', messageId);
    if (error) throw error;
  }
}
