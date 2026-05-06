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

  async getChatById(chatId: number) {
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

  async deleteChat(chatId: number) {
    const { error } = await this.db.from(CHATS_TABLE).delete().eq('id', chatId);
    if (error) throw error;
  }

  async getMessages(chatId: number) {
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

  async markMessageRead(messageId: number) {
    const { data, error } = await this.db
      .from(MESSAGES_TABLE)
      .update({ read: true })
      .eq('id', messageId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteMessage(messageId: number) {
    const { error } = await this.db
      .from(MESSAGES_TABLE)
      .delete()
      .eq('id', messageId);
    if (error) throw error;
  }
}
