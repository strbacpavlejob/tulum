import { ConflictException, Injectable } from '@nestjs/common';
import { toUtcIsoString } from '../common/db-timestamp';
import { SupabaseService } from '../supabase/supabase.service';

const TICKETS_TABLE = 'tickets';
// supabase/migrations/20261019182832_attend_event_with_overlap_check.sql
const ATTEND_EVENT_FUNCTION = 'attend_event_with_overlap_check';

type AttendEventResult = {
  ticket: Record<string, unknown> | null;
  is_new: boolean;
  conflicting_event_title: string | null;
};

@Injectable()
export class TicketsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getTicketById(
    ticketId: string,
  ): Promise<(Record<string, unknown> & { guest_id: string }) | null> {
    const { data, error } = await this.db
      .from(TICKETS_TABLE)
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();
    if (error) throw error;
    return data as (Record<string, unknown> & { guest_id: string }) | null;
  }

  async getTickets(guestId?: string, eventId?: string) {
    let query = this.db
      .from(TICKETS_TABLE)
      .select(
        'id, event_id, guest_id, created_at, events(id, title, description, start_date_time, end_date_time, tags, picture_url, venues(name, picture_url, address, latitude, longitude))',
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
      date: toUtcIsoString(t.events?.start_date_time ?? t.created_at),
      end_date_time: toUtcIsoString(t.events?.end_date_time),
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

  async attendEvent(guestId: string, eventId: string) {
    // One database call: the function locks the guest, returns an existing
    // ticket, re-checks overlaps and inserts in a single transaction. Checking
    // and inserting in separate requests let concurrent RSVPs to two
    // overlapping events both pass the check.
    const { data, error } = await this.db
      .rpc(ATTEND_EVENT_FUNCTION, {
        p_guest_id: guestId,
        p_event_id: eventId,
      })
      .single<AttendEventResult>();
    if (error) throw error;

    if (data.conflicting_event_title !== null) {
      throw new ConflictException(
        `This event overlaps with "${data.conflicting_event_title}" that you are already attending`,
      );
    }

    return { ticket: data.ticket, isNew: data.is_new };
  }

  async unattendEvent(guestId: string, eventId: string) {
    const { error } = await this.db
      .from(TICKETS_TABLE)
      .delete()
      .eq('guest_id', guestId)
      .eq('event_id', eventId);
    if (error) throw error;
    return { success: true };
  }

  async deleteTicket(ticketId: string) {
    const { error } = await this.db
      .from(TICKETS_TABLE)
      .delete()
      .eq('id', ticketId);
    if (error) throw error;
  }

  async getEventAttendees(eventId: string) {
    const [ticketsResult, eventResult] = await Promise.all([
      this.db
        .from(TICKETS_TABLE)
        .select(
          'guest_id, guests!tickets_guest_id_fkey(gender, birthday, users!guests_user_id_fkey(first_name, last_name, avatar_url))',
        )
        .eq('event_id', eventId),
      this.db
        .from('events')
        .select('venues(capacity)')
        .eq('id', eventId)
        .single(),
    ]);

    if (ticketsResult.error) throw ticketsResult.error;
    if (eventResult.error) throw eventResult.error;

    const maxSpots: number = (eventResult.data as any)?.venues?.capacity ?? 0;
    const now = Date.now();

    const guestList = (ticketsResult.data ?? []).map((t: any) => {
      const guest = t.guests ?? {};
      const user = guest.users ?? {};
      const firstName = user.first_name ?? '';
      const lastName = user.last_name ?? '';
      const name = [firstName, lastName].filter(Boolean).join(' ') || 'Guest';
      const age = guest.birthday
        ? Math.floor(
            (now - new Date(guest.birthday).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25),
          )
        : null;
      return {
        name,
        age,
        gender: (guest.gender as string | null) ?? null,
        uri: (user.avatar_url as string | null) ?? null,
      };
    });

    const withAge = guestList.filter((g) => g.age !== null);
    const averageAge =
      withAge.length > 0
        ? Math.round(
            withAge.reduce((sum, g) => sum + (g.age as number), 0) /
              withAge.length,
          )
        : null;

    const females = guestList.filter((g) => g.gender === 'female').length;
    const males = guestList.filter((g) => g.gender === 'male').length;

    return { maxSpots, averageAge, females, males, guestList };
  }
}
