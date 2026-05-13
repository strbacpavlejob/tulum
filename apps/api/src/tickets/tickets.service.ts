import { ConflictException, Injectable } from '@nestjs/common';
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
    let query = this.db
      .from(TICKETS_TABLE)
      .select(
        'id, event_id, guest_id, created_at, events(id, title, description, start_date_time, tags, picture_url, venues(name, picture_url, address, latitude, longitude))',
      );
    if (guestId) query = query.eq('guest_id', guestId);
    if (eventId) query = query.eq('event_id', eventId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((t: any) => ({
      id: String(t.id),
      event_id: String(t.event_id),
      title: t.events?.title ?? '',
      description: t.events?.description ?? '',
      date: t.events?.start_date_time ?? t.created_at,
      tags: t.events?.tags ?? [],
      image: t.events?.picture_url ?? t.events?.venues?.picture_url ?? null,
      venue_name: t.events?.venues?.name ?? '',
      address: t.events?.venues?.address ?? '',
      latitude: t.events?.venues?.latitude ?? 0,
      longitude: t.events?.venues?.longitude ?? 0,
    }));
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

  async attendEvent(guestId: string, eventId: number) {
    // Return existing ticket if already attending (idempotent)
    const { data: existing } = await this.db
      .from(TICKETS_TABLE)
      .select('*')
      .eq('guest_id', guestId)
      .eq('event_id', eventId)
      .maybeSingle();
    if (existing) return { ticket: existing, isNew: false };

    // Fetch the target event's time window
    const { data: targetEvent, error: targetError } = await this.db
      .from('events')
      .select('id, title, start_date_time, end_date_time')
      .eq('id', eventId)
      .single();
    if (targetError) throw targetError;

    const targetStart = new Date(targetEvent.start_date_time);
    const targetEnd = new Date(targetEvent.end_date_time);

    // Fetch all existing tickets for this guest joined with their event times
    const { data: existingTickets, error: ticketsError } = await this.db
      .from(TICKETS_TABLE)
      .select('event_id, events(title, start_date_time, end_date_time)')
      .eq('guest_id', guestId);
    if (ticketsError) throw ticketsError;

    for (const t of existingTickets ?? []) {
      const ev = (t as any).events;
      if (!ev) continue;
      const start = new Date(ev.start_date_time);
      const end = new Date(ev.end_date_time);
      // Two windows overlap when start1 < end2 AND start2 < end1
      if (targetStart < end && start < targetEnd) {
        throw new ConflictException(
          `This event overlaps with "${ev.title}" that you are already attending`,
        );
      }
    }

    const { data, error } = await this.db
      .from(TICKETS_TABLE)
      .insert({ guest_id: guestId, event_id: eventId })
      .select()
      .single();
    if (error) throw error;
    return { ticket: data, isNew: true };
  }

  async unattendEvent(guestId: string, eventId: number) {
    const { error } = await this.db
      .from(TICKETS_TABLE)
      .delete()
      .eq('guest_id', guestId)
      .eq('event_id', eventId);
    if (error) throw error;
    return { success: true };
  }

  async deleteTicket(ticketId: number) {
    const { error } = await this.db
      .from(TICKETS_TABLE)
      .delete()
      .eq('id', ticketId);
    if (error) throw error;
  }
}
