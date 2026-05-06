import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TICKETS_TABLE = 'tickets';

@Injectable()
export class TicketsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getTicketById(ticketId: number) {
    const { data, error } = await this.db
      .from(TICKETS_TABLE)
      .select('*')
      .eq('id', ticketId)
      .single();
    if (error) throw error;
    return data;
  }

  async getTickets(guestId?: string, eventId?: number) {
    let query = this.db.from(TICKETS_TABLE).select('*');
    if (guestId) query = query.eq('guest_id', guestId);
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async createTicket(ticket: Record<string, unknown>) {
    const { data, error } = await this.db
      .from(TICKETS_TABLE)
      .insert(ticket)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteTicket(ticketId: number) {
    const { error } = await this.db
      .from(TICKETS_TABLE)
      .delete()
      .eq('id', ticketId);
    if (error) throw error;
  }
}
