import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const CHATS_TABLE = 'chats';
const MESSAGES_TABLE = 'chat_messages';

@Injectable()
export class ChatsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getChatById(chatId: string) {
    const { data, error } = await this.db
      .from(CHATS_TABLE)
      .select('*')
      .eq('id', chatId)
      .single();
    if (error) throw error;
    return data;
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

  async markMessageRead(messageId: string) {
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
