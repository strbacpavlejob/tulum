import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { OnboardingDto } from './dto/onboarding.dto';

const GUESTS_TABLE = 'guests';

function isOnboardingComplete(guest: Record<string, unknown> | null): boolean {
  if (!guest) return false;
  return !!(
    guest.gender != null &&
    guest.seeking != null &&
    Array.isArray(guest.interested_in) &&
    (guest.interested_in as unknown[]).length > 0
  );
}

@Injectable()
export class GuestsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getGuestMe(userId: string) {
    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return {
      guest: data ?? null,
      isOnboardingComplete: isOnboardingComplete(data),
    };
  }

  async getSwipeableGuests(userId: string, eventId?: number) {
    let targetEventId = eventId;

    if (!targetEventId) {
      // Auto-detect from the user's most recent active event session
      const { data: session } = await this.db
        .from('event_sessions')
        .select('event_id')
        .eq('user_id', userId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!session)
        return {
          event_id: null,
          event_title: '',
          event_venue: '',
          profiles: [],
        };
      targetEventId = session.event_id as number;
    }

    // Find guests already matched with the current user at this event
    const { data: existingMatches } = await this.db
      .from('matches')
      .select('guest_id_1, guest_id_2')
      .eq('event_id', targetEventId)
      .or(`guest_id_1.eq.${userId},guest_id_2.eq.${userId}`);

    const matchedIds = new Set<string>([userId]);
    for (const m of existingMatches ?? []) {
      matchedIds.add(m.guest_id_1 as string);
      matchedIds.add(m.guest_id_2 as string);
    }

    // Find all user_ids at this event via event_sessions
    const { data: sessions } = await this.db
      .from('event_sessions')
      .select('user_id')
      .eq('event_id', targetEventId)
      .neq('user_id', userId);

    const candidateIds = (sessions ?? [])
      .map((s: Record<string, unknown>) => s.user_id as string)
      .filter((id) => !matchedIds.has(id));

    // Fetch guest profiles + user info for candidates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profiles: any[] = [];
    if (candidateIds.length > 0) {
      const { data: guests, error } = await this.db
        .from(GUESTS_TABLE)
        .select(
          'user_id, picture_urls, birthday, interests, users!guests_user_id_fkey(first_name, last_name, avatar_url)',
        )
        .in('user_id', candidateIds);
      if (error) throw error;

      profiles = (guests ?? []).map((g: Record<string, unknown>) => {
        const user = g.users as Record<string, unknown> | null;
        const birthday = g.birthday ? new Date(g.birthday as string) : null;
        const age = birthday
          ? Math.floor(
              (Date.now() - birthday.getTime()) / (365.25 * 24 * 3600 * 1000),
            )
          : 0;
        return {
          user_id: g.user_id as string,
          event_id: targetEventId,
          first_name: (user?.first_name ?? null) as string | null,
          last_name: (user?.last_name ?? null) as string | null,
          avatar_url: (user?.avatar_url ?? null) as string | null,
          picture_urls: (g.picture_urls ?? []) as string[],
          age,
          interests: (g.interests ?? []) as string[],
        };
      });
    }

    // Fetch event title + venue name
    const { data: event } = await this.db
      .from('events')
      .select('id, title, venues!events_venue_id_fkey(name)')
      .eq('id', targetEventId)
      .maybeSingle();

    return {
      event_id: targetEventId as number,
      event_title: (event?.title ?? '') as string,
      event_venue: ((event?.venues as unknown as Record<string, unknown> | null)
        ?.name ?? '') as string,
      profiles,
    };
  }

  async upsertOnboarding(userId: string, dto: OnboardingDto) {
    const payload = {
      user_id: userId,
      gender: dto.gender,
      seeking: dto.seeking,
      interested_in: dto.interested_in,
      interests: dto.interests ?? [],
      picture_urls: dto.picture_urls ?? [],
      birthday: dto.birthday,
    };

    const { data, error } = await this.db
      .from(GUESTS_TABLE)
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return {
      guest: data,
      isOnboardingComplete: isOnboardingComplete(
        data as Record<string, unknown>,
      ),
    };
  }
}
