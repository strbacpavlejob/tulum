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
