import { Injectable } from '@nestjs/common';
import { countTicketsByEvent } from '../common/ticket-counts';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizeInstagramHandle } from '../venue-pictures/venue-picture-rules';
import { groupOfVenueType, PostEvent } from './instagram-post-rules';

const EVENTS_TABLE = 'events';

interface EventRow {
  id: string;
  title: string;
  picture_url: string | null;
  start_date_time: string;
  venues: VenueRow | VenueRow[] | null;
}

interface VenueRow {
  id: string;
  name: string;
  venue_type: string | null;
  picture_url: string | null;
  venue_contacts: VenueContactRow | VenueContactRow[] | null;
}

interface VenueContactRow {
  instagram_handle: string | null;
}

/** The weekly Instagram posts' database reads. */
@Injectable()
export class InstagramPostsDataService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Active events at imported venues that start from `from` until `until`,
   * with a picture and the number of guests going. Venues made in the
   * dashboard are left out: every one so far is a test venue, and
   * development and production share the database.
   */
  async fetchEvents(from: Date, until: Date): Promise<PostEvent[]> {
    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .select(
        'id, title, picture_url, start_date_time, venues!inner(id, name, venue_type, picture_url, venue_contacts!venues_contact_id_fkey(instagram_handle))',
      )
      .eq('status', 'active')
      .gte('start_date_time', from.toISOString())
      .lt('start_date_time', until.toISOString())
      .not('venues.scraper', 'is', null)
      .order('start_date_time', { ascending: true });
    if (error) {
      throw new Error(`Failed to fetch the week's events: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as EventRow[];
    const guests = await countTicketsByEvent(
      this.db,
      rows.map((row) => row.id),
    );

    return rows.flatMap((row): PostEvent[] => {
      const venue = first(row.venues);
      const group = groupOfVenueType(venue?.venue_type);
      const pictureUrl = row.picture_url || venue?.picture_url;
      if (!venue || !group || !pictureUrl) return [];

      return [
        {
          id: row.id,
          title: row.title,
          startsAt: row.start_date_time,
          pictureUrl,
          venueId: venue.id,
          venueName: venue.name,
          group,
          instagramHandle: normalizeInstagramHandle(
            first(venue.venue_contacts)?.instagram_handle,
          ),
          guestCount: guests.get(row.id) ?? 0,
        },
      ];
    });
  }
}

function first<T>(value: T | T[] | null): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}
