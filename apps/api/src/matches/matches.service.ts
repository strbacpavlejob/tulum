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

  async getMatches(guestId?: string, eventId?: number) {
    let query = this.db.from(MATCHES_TABLE).select('*');
    if (guestId)
      query = query.or(`guest1_id.eq.${guestId},guest2_id.eq.${guestId}`);
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
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
