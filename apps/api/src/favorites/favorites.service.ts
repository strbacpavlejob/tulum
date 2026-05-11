import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const ENGAGEMENTS_TABLE = 'event_engagements';
const SAVED = 'saved';

@Injectable()
export class FavoritesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getFavorites(userId: string) {
    const { data, error } = await this.db
      .from(ENGAGEMENTS_TABLE)
      .select('event_id, created_at')
      .eq('user_id', userId)
      .eq('engagement_type', SAVED);
    if (error) throw error;
    return data ?? [];
  }

  async isFavorited(userId: string, eventId: number) {
    const { data, error } = await this.db
      .from(ENGAGEMENTS_TABLE)
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('engagement_type', SAVED)
      .maybeSingle();
    if (error) throw error;
    return { isFavorite: !!data };
  }

  async addFavorite(userId: string, eventId: number) {
    const { error } = await this.db.from(ENGAGEMENTS_TABLE).upsert(
      { user_id: userId, event_id: eventId, engagement_type: SAVED },
      {
        onConflict: 'user_id,event_id,engagement_type',
        ignoreDuplicates: true,
      },
    );
    if (error) throw error;
    return { isFavorite: true };
  }

  async removeFavorite(userId: string, eventId: number) {
    const { error } = await this.db
      .from(ENGAGEMENTS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('engagement_type', SAVED);
    if (error) throw error;
    return { isFavorite: false };
  }

  async toggleFavorite(userId: string, eventId: number) {
    const { isFavorite } = await this.isFavorited(userId, eventId);
    if (isFavorite) {
      return this.removeFavorite(userId, eventId);
    }
    return this.addFavorite(userId, eventId);
  }
}
