import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const MATCHES_TABLE = 'matches';

@Injectable()
export class MatchesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getMatchById(matchId: number) {
    const { data, error } = await this.db
      .from(MATCHES_TABLE)
      .select('*')
      .eq('id', matchId)
      .single();
    if (error) throw error;
    return data;
  }

  async getMatches(guestId?: string, eventId?: string) {
    let query = this.db.from(MATCHES_TABLE).select('*');
    if (guestId)
      query = query.or(`guest_id_1.eq.${guestId},guest_id_2.eq.${guestId}`);
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getMyMatches(userId: string) {
    const { data, error } = await this.db
      .from(MATCHES_TABLE)
      .select(
        `
        id,
        guest_id_1,
        guest_id_2,
        matched_at,
        guest1:guests!matches_guest_id_1_fkey(
          user_id,
          picture_urls,
          birthday,
          interests,
          user:users!guests_user_id_fkey(first_name, last_name, avatar_url)
        ),
        guest2:guests!matches_guest_id_2_fkey(
          user_id,
          picture_urls,
          birthday,
          interests,
          user:users!guests_user_id_fkey(first_name, last_name, avatar_url)
        ),
        event:events!matches_event_id_fkey(
          id,
          title,
          venue:venues!events_venue_id_fkey(name)
        ),
        chats!chats_match_id_fkey(
          id,
          chat_messages(
            id,
            message,
            sender_id,
            sent_at
          )
        )
      `,
      )
      .or(`guest_id_1.eq.${userId},guest_id_2.eq.${userId}`)
      .order('matched_at', { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((match: any) => {
      const isGuest1 = match.guest_id_1 === userId;
      const other = isGuest1 ? match.guest2 : match.guest1;
      const chat = match.chats?.[0] ?? null;
      const chatId: string | null = chat?.id ?? null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgs: any[] = chat?.chat_messages ?? [];
      const sortedMsgs = [...msgs].sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
      );
      const lastMsg = sortedMsgs[0] ?? null;

      return {
        id: match.id as number,
        matched_at: match.matched_at as string,
        chat_id: chatId,
        has_messages: msgs.length > 0,
        last_message: lastMsg
          ? {
              id: lastMsg.id as number,
              text: lastMsg.message as string,
              sender_id: lastMsg.sender_id as string,
              sent_at: lastMsg.sent_at as string,
            }
          : null,
        other_guest: {
          user_id: (other?.user_id ?? null) as string | null,
          first_name: (other?.user?.first_name ?? null) as string | null,
          last_name: (other?.user?.last_name ?? null) as string | null,
          avatar_url: (other?.user?.avatar_url ?? null) as string | null,
          picture_urls: (other?.picture_urls ?? []) as string[],
          birthday: (other?.birthday ?? null) as string | null,
          interests: (other?.interests ?? []) as string[],
        },
        event: match.event
          ? {
              id: match.event.id as string,
              title: match.event.title as string,
              venue_name: (match.event.venue?.name ?? null) as string | null,
            }
          : null,
      };
    });
  }

  async createMatch(match: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(MATCHES_TABLE)
      .insert(match)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteMatch(matchId: number) {
    const { error } = await this.db
      .from(MATCHES_TABLE)
      .delete()
      .eq('id', matchId);
    if (error) throw error;
  }
}
