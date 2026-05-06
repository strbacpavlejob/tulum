import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Venue } from '../scrape/interfaces/venue.interface';
import { Event } from '../scrape/interfaces/event.interface';

const VENUES_TABLE = 'venues';
const EVENTS_TABLE = 'events';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async saveScrapedData(data: {
    venues: Omit<Venue, 'id'>[];
    events: (Omit<Event, 'id'> & { id?: number })[];
  }): Promise<{ venues: number; events: number }> {
    this.logger.log(
      `Saving scraped data: ${data.venues.length} venues, ${data.events.length} events`,
    );

    // 1. Upsert venues and get back their DB IDs
    const venueNameToId = await this.upsertVenues(data.venues);

    // 2. Map events to use real DB venue IDs (scraped data uses temporary IDs)
    const mappedEvents: Record<string, unknown>[] = [];
    for (const event of data.events) {
      const dbVenueId = event.venue_name
        ? venueNameToId.get(event.venue_name)
        : undefined;
      if (!dbVenueId) {
        this.logger.warn(
          `Skipping event "${event.title}" - no matching venue found (venue_name: ${event.venue_name})`,
        );
        continue;
      }
      mappedEvents.push(this.mapEventToDbRow(event, dbVenueId));
    }

    // 3. Upsert events
    const savedEventsCount = await this.upsertEvents(mappedEvents);

    this.logger.log(
      `Saved ${venueNameToId.size} venues and ${savedEventsCount} events`,
    );

    return { venues: venueNameToId.size, events: savedEventsCount };
  }

  private async upsertVenues(
    venues: Omit<Venue, 'id'>[],
  ): Promise<Map<string, number>> {
    const dbRows = venues.map((venue) => this.mapVenueToDbRow(venue));

    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .upsert(dbRows, { onConflict: 'name' })
      .select('id, name');

    if (error) {
      this.logger.error('Error upserting venues:', error.message);
      throw new Error(`Failed to upsert venues: ${error.message}`);
    }

    const venueNameToId = new Map<string, number>();
    data?.forEach((v: { name: string; id: number }) =>
      venueNameToId.set(v.name, v.id),
    );

    return venueNameToId;
  }

  private async upsertEvents(
    events: Record<string, unknown>[],
  ): Promise<number> {
    if (events.length === 0) return 0;

    const { data, error } = await this.supabase
      .from(EVENTS_TABLE)
      .upsert(events, {
        onConflict: 'title,venue_id,start_date_time',
      })
      .select('id');

    if (error) {
      this.logger.error('Error upserting events:', error.message);
      throw new Error(`Failed to upsert events: ${error.message}`);
    }

    return data?.length ?? 0;
  }

  private mapVenueToDbRow(venue: Omit<Venue, 'id'>): Record<string, unknown> {
    const row: Record<string, unknown> = {
      host_id: venue.host_id,
      name: venue.name,
      longitude: venue.longitude,
      latitude: venue.latitude,
      venue_type: venue.type,
      capacity: venue.capacity,
      address: venue.address,
      description: venue.description,
      picture_url: venue.picture,
      scraper: venue.scraper,
      instagram_url: venue.instagram_url,
    };
    // Remove undefined values so they don't overwrite existing data as null
    return Object.fromEntries(
      Object.entries(row).filter(([, v]) => v !== undefined),
    );
  }

  private mapEventToDbRow(
    event: Omit<Event, 'id'> & { id?: number },
    dbVenueId: number,
  ): Record<string, unknown> {
    return {
      venue_id: dbVenueId,
      title: event.title,
      description: event.description,
      start_date_time: event.start_date_time,
      end_date_time: event.end_date_time,
      tags: event.tags,
      picture_url: event.picture,
      status: event.status,
    };
  }

  async getThisWeekEventsWithVenues(): Promise<Record<string, unknown>[]> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(now);
    const daysUntilEndOfWeek = 6 - now.getDay(); // Saturday = end of week
    endOfWeek.setDate(now.getDate() + daysUntilEndOfWeek);
    endOfWeek.setHours(23, 59, 59, 999);

    const { data, error } = await this.supabase
      .from(EVENTS_TABLE)
      .select(`*, ${VENUES_TABLE}(name, address, picture_url)`)
      .gte('start_date_time', startOfToday.toISOString())
      .lte('start_date_time', endOfWeek.toISOString())
      .eq('status', 'active')
      .order('start_date_time', { ascending: true });

    if (error) {
      this.logger.error('Error fetching this week events:', error.message);
      throw new Error(`Failed to fetch this week events: ${error.message}`);
    }

    return (data as Record<string, unknown>[]) ?? [];
  }

  async fetchAllVenues(): Promise<
    { id: number; name: string; instagram_url?: string }[]
  > {
    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .select('id, name, instagram_url');

    if (error) {
      this.logger.error('Error fetching venues:', error.message);
      throw new Error(`Failed to fetch venues: ${error.message}`);
    }

    return (
      (data as { id: number; name: string; instagram_url?: string }[]) ?? []
    );
  }

  async createVenue(venue: Omit<Venue, 'id'>): Promise<number> {
    const row = this.mapVenueToDbRow(venue);

    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .upsert(row, { onConflict: 'name' })
      .select('id')
      .single();

    if (error) {
      this.logger.error('Error creating venue:', error.message);
      throw new Error(`Failed to create venue: ${error.message}`);
    }

    return (data as { id: number }).id;
  }

  async updateVenuePicture(venueId: number, pictureUrl: string): Promise<void> {
    const { error } = await this.supabase
      .from(VENUES_TABLE)
      .update({ picture_url: pictureUrl })
      .eq('id', venueId);

    if (error) {
      this.logger.error(
        `Error updating picture for venue ${venueId}:`,
        error.message,
      );
      throw new Error(`Failed to update venue picture: ${error.message}`);
    }
  }

  async saveVenueEvents(
    events: (Omit<Event, 'id'> & { id?: number })[],
    venueId: number,
  ): Promise<number> {
    if (events.length === 0) return 0;

    const rows = events.map((e) => this.mapEventToDbRow(e, venueId));
    return this.upsertEvents(rows);
  }

  async deleteOldEvents(before?: string): Promise<number> {
    const cutoff = before ?? new Date().toISOString();

    const { data, error } = await this.supabase
      .from(EVENTS_TABLE)
      .delete()
      .lt('end_date_time', cutoff)
      .select('id');

    if (error) {
      this.logger.error('Error deleting old events:', error.message);
      throw new Error(`Failed to delete old events: ${error.message}`);
    }

    const count = data?.length ?? 0;
    this.logger.log(
      `Deleted ${count} events with end_date_time before ${cutoff}`,
    );
    return count;
  }
}
