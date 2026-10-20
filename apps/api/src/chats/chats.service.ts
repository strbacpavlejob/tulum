import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const CHATS_TABLE = 'chats';
const MESSAGES_TABLE = 'chat_messages';

@Injectable()
export class ChatsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  // ── Access checks ─────────────────────────────────────────────────────
  // Only the two guests of a match may open its chat or touch its messages.
  // Someone else's chat, match or message is reported as not found, so ids
  // cannot be probed.

  private async isMatchParticipant(matchId: number, userId: string) {
    const { data, error } = await this.db
      .from('matches')
      .select('guest_id_1, guest_id_2')
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw error;
    return data?.guest_id_1 === userId || data?.guest_id_2 === userId;
  }

  async assertMatchParticipant(matchId: number, userId: string) {
    if (!(await this.isMatchParticipant(matchId, userId))) {
      throw new NotFoundException('Match not found');
    }
  }

  private async findChatForParticipant(chatId: string, userId: string) {
    const { data: chat, error } = await this.db
      .from(CHATS_TABLE)
      .select('id, match_id, event_id, created_at')
      .eq('id', chatId)
      .maybeSingle();
    if (error) throw error;
    if (
      !chat ||
      !(await this.isMatchParticipant(chat.match_id as number, userId))
    ) {
      return null;
    }
    return chat;
  }

  /** The chat, if the user is one of its match's guests; otherwise 404. */
  async getChatForParticipant(chatId: string, userId: string) {
    const chat = await this.findChatForParticipant(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
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

  async createMessage(message: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(MESSAGES_TABLE)
      .insert(message)
      .select()
      .single();
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
