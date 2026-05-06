import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const FAVORITES_TABLE = 'favorites';

@Injectable()
export class FavoritesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getFavorites(userId: string) {
    const { data, error } = await this.db
      .from(FAVORITES_TABLE)
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data ?? [];
  }

  async isFavorited(userId: string, eventId: number) {
    const { data, error } = await this.db
      .from(FAVORITES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return { isFavorite: !!data };
  }

  async addFavorite(userId: string, eventId: number) {
    const { data, error } = await this.db
      .from(FAVORITES_TABLE)
      .insert({ user_id: userId, event_id: eventId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async removeFavorite(favoriteId: number) {
    const { error } = await this.db
      .from(FAVORITES_TABLE)
      .delete()
      .eq('id', favoriteId);
    if (error) throw error;
  }
}
