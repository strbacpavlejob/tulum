import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SwipeDecisionDto } from './dto/swipe-decision.dto';

const MATCHES_TABLE = 'matches';
const GUEST_SWIPES_TABLE = 'guest_swipes';

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
          end_date_time,
          venue:venues!events_venue_id_fkey(name, latitude, longitude)
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

    const nowMs = Date.now();

    return (data ?? [])
      .filter((match: any) => {
        const endDateRaw = match?.event?.end_date_time;
        if (!endDateRaw) return false;
        const endMs = new Date(endDateRaw).getTime();
        return Number.isFinite(endMs) && endMs >= nowMs;
      })
      .map((match: any) => {
        const isGuest1 = match.guest_id_1 === userId;
        const other = isGuest1 ? match.guest2 : match.guest1;
        const chat = match.chats?.[0] ?? null;
        const chatId: string | null = chat?.id ?? null;
        const msgs: any[] = chat?.chat_messages ?? [];
        const sortedMsgs = [...msgs].sort(
          (a, b) =>
            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
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
                venue_lat: (match.event.venue?.latitude ?? null) as
                  | number
                  | null,
                venue_lng: (match.event.venue?.longitude ?? null) as
                  | number
                  | null,
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

  async submitSwipeDecision(
    userId: string,
    swipe: SwipeDecisionDto,
  ): Promise<{ matched: boolean; match_id: number | null }> {
    const { other_user_id: otherUserId, event_id: eventId, liked } = swipe;

    if (userId === otherUserId) {
      throw new BadRequestException('Cannot swipe on yourself');
    }

    const { data: swipeSession } = await this.db
      .from('event_sessions')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .is('exited_at', null)
      .maybeSingle();

    const { data: targetSession } = await this.db
      .from('event_sessions')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', otherUserId)
      .maybeSingle();

    const { data: targetTicket } = await this.db
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('guest_id', otherUserId)
      .maybeSingle();

    if (!swipeSession || (!targetSession && !targetTicket)) {
      throw new BadRequestException(
        'Both users must be at the same live event',
      );
    }

    const { error: swipeError } = await this.db.from(GUEST_SWIPES_TABLE).upsert(
      {
        swiper_user_id: userId,
        swiped_user_id: otherUserId,
        event_id: eventId,
        liked,
      },
      { onConflict: 'swiper_user_id,swiped_user_id,event_id' },
    );
    if (swipeError) throw swipeError;

    if (!liked) {
      return { matched: false, match_id: null };
    }

    const { data: reciprocal, error: reciprocalError } = await this.db
      .from(GUEST_SWIPES_TABLE)
      .select('id')
      .eq('swiper_user_id', otherUserId)
      .eq('swiped_user_id', userId)
      .eq('event_id', eventId)
      .eq('liked', true)
      .maybeSingle();
    if (reciprocalError) throw reciprocalError;

    if (!reciprocal) {
      return { matched: false, match_id: null };
    }

    const [guestId1, guestId2] = [userId, otherUserId].sort((a, b) =>
      a.localeCompare(b),
    );

    const { data: existingMatch, error: existingMatchError } = await this.db
      .from(MATCHES_TABLE)
      .select('id')
      .eq('guest_id_1', guestId1)
      .eq('guest_id_2', guestId2)
      .eq('event_id', eventId)
      .maybeSingle();
    if (existingMatchError) throw existingMatchError;

    if (existingMatch) {
      return { matched: true, match_id: existingMatch.id as number };
    }

    const { data: match, error: matchError } = await this.db
      .from(MATCHES_TABLE)
      .insert({
        guest_id_1: guestId1,
        guest_id_2: guestId2,
        event_id: eventId,
      })
      .select('id')
      .single();

    // Another concurrent request may have inserted first.
    if (matchError) {
      const isUniqueViolation =
        (matchError as { code?: string }).code === '23505';
      if (!isUniqueViolation) throw matchError;

      const { data: concurrentMatch, error: concurrentMatchError } =
        await this.db
          .from(MATCHES_TABLE)
          .select('id')
          .eq('guest_id_1', guestId1)
          .eq('guest_id_2', guestId2)
          .eq('event_id', eventId)
          .single();
      if (concurrentMatchError) throw concurrentMatchError;
      return { matched: true, match_id: concurrentMatch.id as number };
    }

    return { matched: true, match_id: match.id as number };
  }

  async deleteMatch(matchId: number) {
    const { error } = await this.db
      .from(MATCHES_TABLE)
      .delete()
      .eq('id', matchId);
    if (error) throw error;
  }
}
