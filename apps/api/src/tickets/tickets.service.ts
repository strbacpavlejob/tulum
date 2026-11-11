import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { toUtcIsoString } from '../common/db-timestamp';
import { isMissingFunction } from '../common/missing-function';
import { pageSize } from '../common/paging';
import { GuestSafetyService } from '../guest-safety/guest-safety.service';
import { guestVisibility, isShownTo } from '../guest-safety/guest-visibility';
import { SupabaseService } from '../supabase/supabase.service';

const TICKETS_TABLE = 'tickets';
// supabase/migrations/20261019182832_attend_event_with_overlap_check.sql
const ATTEND_EVENT_FUNCTION = 'attend_event_with_overlap_check';
// supabase/migrations/20261111210742_paged_swipe_deck_and_guest_list.sql
const GUEST_LIST_FUNCTION = 'get_event_guest_list';
/** Guests in a page of the guest list when the request names no limit. */
export const GUEST_LIST_PAGE_SIZE = 30;
/** A guest list cursor: 0 for the viewer's own row or 1, then a ticket id. */
const GUEST_LIST_CURSOR = /^[01][0-9a-f-]{36}$/;

type AttendEventResult = {
  ticket: Record<string, unknown> | null;
  is_new: boolean;
  conflicting_event_title: string | null;
};

/** What get_event_guest_list returns. */
type GuestListResult = {
  max_spots: number;
  going_count: number;
  listed_count: number;
  females: number;
  males: number;
  average_age: number | null;
  guests: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    age: number | null;
    gender: string | null;
    is_viewer: boolean;
  }[];
  next_cursor: string | null;
};

/** The name on the guest list: first and last, or "Guest" with neither. */
function guestName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Guest';
}

interface TicketRow {
  id: string;
  event_id: string;
  created_at: string;
  events: {
    title: string | null;
    description: string | null;
    start_date_time: string | null;
    end_date_time: string | null;
    tags: string[] | null;
    picture_url: string | null;
    venues: {
      name: string | null;
      picture_url: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
  } | null;
}

interface TicketCountRow {
  event_id: string;
}

@Injectable()
export class TicketsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly guestSafety: GuestSafetyService,
  ) {}

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
    const { data, error } = await query.returns<TicketRow[]>();
    if (error) throw error;

    const tickets = data ?? [];
    const eventIds = [...new Set(tickets.map((ticket) => ticket.event_id))];
    const guestCountMap = new Map<string, number>();

    if (eventIds.length > 0) {
      const { data: ticketCounts, error: ticketCountsError } = await this.db
        .from(TICKETS_TABLE)
        .select('event_id')
        .in('event_id', eventIds)
        .returns<TicketCountRow[]>();
      if (ticketCountsError) throw ticketCountsError;

      for (const ticketCount of ticketCounts ?? []) {
        const id = ticketCount.event_id;
        guestCountMap.set(id, (guestCountMap.get(id) ?? 0) + 1);
      }
    }

    return tickets.map((t) => ({
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
      guest_count: guestCountMap.get(String(t.event_id)) ?? 0,
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

  /**
   * GET /tickets/attendees: the event's numbers and, for a guest going to
   * it, who else is going, a page at a time. The guest list shows the viewer
   * first, then each other guest whose visibility includes the viewer and
   * who isn't blocked either way. Someone not going sees no one. The numbers
   * count every guest going (goingCount), and hiddenCount is how many of
   * them the list leaves out. Pass nextCursor back as cursor for the next
   * page; it is null on the last.
   */
  async getEventAttendees(
    eventId: string,
    viewerId: string,
    page?: { cursor?: string | null; limit?: number | null },
  ) {
    const cursor = page?.cursor || null;
    if (cursor !== null && !GUEST_LIST_CURSOR.test(cursor)) {
      throw new BadRequestException('Invalid cursor');
    }
    const limit = pageSize(page?.limit, GUEST_LIST_PAGE_SIZE);

    const { data, error } = await this.db.rpc(GUEST_LIST_FUNCTION, {
      p_viewer_id: viewerId,
      p_event_id: eventId,
      p_cursor: cursor,
      p_limit: limit,
    });
    if (error) {
      // Until that function exists, the list is read whole as before.
      if (isMissingFunction(error)) {
        return this.wholeGuestList(eventId, viewerId, cursor, limit);
      }
      throw error;
    }

    const list = data as GuestListResult;
    return {
      maxSpots: list.max_spots,
      averageAge: list.average_age,
      females: list.females,
      males: list.males,
      goingCount: list.going_count,
      guestList: list.guests.map((g) => ({
        name: guestName(g.first_name, g.last_name),
        age: g.age,
        gender: g.gender,
        uri: g.avatar_url,
        isViewer: g.is_viewer,
      })),
      hiddenCount: list.going_count - list.listed_count,
      nextCursor: list.next_cursor,
    };
  }

  /**
   * The guest list as it was read before get_event_guest_list, for while
   * that function is missing: the whole list in one answer. It has no pages,
   * so a request for a later page, or for the numbers alone, gets no guests.
   */
  private async wholeGuestList(
    eventId: string,
    viewerId: string,
    cursor: string | null,
    limit: number,
  ) {
    const [ticketsResult, eventResult, blockedIds, likedViewerIds] =
      await Promise.all([
        // The guests rows are read whole (*) so this works before and after
        // the guest_safety_controls migration adds visibility.
        this.db
          .from(TICKETS_TABLE)
          .select(
            'guest_id, guests!tickets_guest_id_fkey(*, users!guests_user_id_fkey(first_name, last_name, avatar_url))',
          )
          .eq('event_id', eventId),
        this.db
          .from('events')
          .select('venues(capacity)')
          .eq('id', eventId)
          .single(),
        this.guestSafety.blockedUserIds(viewerId),
        this.guestSafety.likedByAt(viewerId, eventId),
      ]);

    if (ticketsResult.error) throw ticketsResult.error;
    if (eventResult.error) throw eventResult.error;

    const maxSpots: number = (eventResult.data as any)?.venues?.capacity ?? 0;
    const now = Date.now();

    const attendees = (ticketsResult.data ?? []).map((t: any) => {
      const guest = t.guests ?? {};
      const user = guest.users ?? {};
      const guestId = (t as { guest_id: string }).guest_id;
      const age = guest.birthday
        ? Math.floor(
            (now - new Date(guest.birthday).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25),
          )
        : null;
      return {
        guestId,
        visibility: guestVisibility(guest as Record<string, unknown>),
        entry: {
          name: guestName(user.first_name, user.last_name),
          age,
          gender: (guest.gender as string | null) ?? null,
          uri: (user.avatar_url as string | null) ?? null,
          isViewer: guestId === viewerId,
        },
      };
    });

    const viewerAttends = attendees.some((a) => a.guestId === viewerId);
    const guestList = viewerAttends
      ? attendees
          .filter(
            (a) =>
              a.guestId === viewerId ||
              isShownTo(a.visibility, {
                blocked: blockedIds.has(a.guestId),
                likedViewer: likedViewerIds.has(a.guestId),
              }),
          )
          .map((a) => a.entry)
      : [];

    const everyone = attendees.map((a) => a.entry);
    const withAge = everyone.filter((g) => g.age !== null);
    const averageAge =
      withAge.length > 0
        ? Math.round(
            withAge.reduce((sum, g) => sum + (g.age as number), 0) /
              withAge.length,
          )
        : null;

    const females = everyone.filter((g) => g.gender === 'female').length;
    const males = everyone.filter((g) => g.gender === 'male').length;

    return {
      maxSpots,
      averageAge,
      females,
      males,
      goingCount: attendees.length,
      guestList: cursor === null && limit > 0 ? guestList : [],
      hiddenCount: attendees.length - guestList.length,
      nextCursor: null,
    };
  }
}
