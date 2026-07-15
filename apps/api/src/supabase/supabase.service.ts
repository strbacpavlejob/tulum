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
    events: (Omit<Event, 'id'> & { id?: string })[];
  }): Promise<{ venues: number; events: number }> {
    this.logger.log(
      `Saving scraped data: ${data.venues.length} venues, ${data.events.length} events`,
    );

    // 1. Upsert venues and get back their DB IDs (always runs)
    const venueNameToId = await this.upsertVenues(data.venues);

    // 1b. Upsert contacts only when SCRAPE_VENUE_CONTACTS=true
    if (process.env.SCRAPE_VENUE_CONTACTS === 'true') {
      await this.upsertVenueContacts(data.venues, venueNameToId);
    } else {
      this.logger.debug(
        'Skipping venue contact upsert (SCRAPE_VENUE_CONTACTS is not "true")',
      );
    }

    // 2. Map events to use real DB venue IDs (scraped data uses temporary IDs)
    const mappedEvents: Record<string, unknown>[] = [];
    for (const event of data.events) {
      const dbVenueId = this.isUuid(event.venue_id)
        ? event.venue_id
        : event.venue_name
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

  private async upsertVenueContacts(
    venues: Omit<Venue, 'id'>[],
    venueNameToId: Map<string, string>,
  ): Promise<void> {
    for (const venue of venues) {
      if (!venue.contact) continue;
      const venueId = venueNameToId.get(venue.name);
      if (!venueId) continue;

      // Skip contacts that have neither phone nor instagram handle
      if (!venue.contact.phone_number && !venue.contact.instagram_handle)
        continue;

      // Upsert contact row — check if venue already has one
      const { data: existingVenue } = await this.supabase
        .from('venues')
        .select('contact_id')
        .eq('id', venueId)
        .single();

      let contactId: string | null =
        (existingVenue as { contact_id: string | null } | null)?.contact_id ??
        null;

      if (contactId) {
        // Update existing contact
        const { error } = await this.supabase
          .from('venue_contacts')
          .update({
            phone_number: venue.contact.phone_number,
            is_phone: venue.contact.is_phone,
            is_viber: venue.contact.is_viber,
            is_sms: venue.contact.is_sms,
            is_whatsapp: venue.contact.is_whatsapp,
            is_instagram: venue.contact.is_instagram ?? false,
            instagram_handle: venue.contact.instagram_handle ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
        if (error) {
          this.logger.warn(
            `Failed to update venue_contact for venue ${venue.name}: ${error.message}`,
          );
        }
      } else {
        // Insert new contact and link to venue
        const { data: newContact, error: insertError } = await this.supabase
          .from('venue_contacts')
          .insert({
            phone_number: venue.contact.phone_number,
            is_phone: venue.contact.is_phone,
            is_viber: venue.contact.is_viber,
            is_sms: venue.contact.is_sms,
            is_whatsapp: venue.contact.is_whatsapp,
            is_instagram: venue.contact.is_instagram ?? false,
            instagram_handle: venue.contact.instagram_handle ?? null,
          })
          .select('id')
          .single();
        if (insertError || !newContact) {
          this.logger.warn(
            `Failed to insert venue_contact for venue ${venue.name}: ${insertError?.message}`,
          );
          continue;
        }
        contactId = (newContact as { id: string }).id;

        const { error: linkError } = await this.supabase
          .from('venues')
          .update({ contact_id: contactId })
          .eq('id', venueId);
        if (linkError) {
          this.logger.warn(
            `Failed to link venue_contact to venue ${venue.name}: ${linkError.message}`,
          );
        }
      }
    }
  }

  private async upsertVenues(
    venues: Omit<Venue, 'id'>[],
  ): Promise<Map<string, string>> {
    const dbRows = venues.map((venue) => this.mapVenueToDbRow(venue));

    // For goout venues, keep existing DB picture_url values intact.
    const gooutVenueNames = Array.from(
      new Set(
        venues
          .filter((venue) => venue.scraper === 'goout')
          .map((venue) => venue.name),
      ),
    );

    const existingGooutVenueNames = new Set<string>();
    if (gooutVenueNames.length > 0) {
      const { data: existingVenues, error: existingVenuesError } =
        await this.supabase
          .from(VENUES_TABLE)
          .select('name')
          .in('name', gooutVenueNames);

      if (existingVenuesError) {
        this.logger.error(
          'Error fetching existing goout venues:',
          existingVenuesError.message,
        );
        throw new Error(
          `Failed to fetch existing goout venues: ${existingVenuesError.message}`,
        );
      }

      (existingVenues as { name: string }[] | null)?.forEach((venue) =>
        existingGooutVenueNames.add(venue.name),
      );
    }

    const upsertRows = dbRows.map((row) => {
      const name = row.name as string | undefined;
      const scraper = row.scraper as string | undefined;

      if (
        name &&
        scraper === 'goout' &&
        existingGooutVenueNames.has(name) &&
        'picture_url' in row
      ) {
        const withoutPicture = { ...row };
        delete withoutPicture.picture_url;
        return withoutPicture;
      }

      return row;
    });

    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .upsert(upsertRows, { onConflict: 'name' })
      .select('id, name');

    if (error) {
      this.logger.error('Error upserting venues:', error.message);
      throw new Error(`Failed to upsert venues: ${error.message}`);
    }

    const venueNameToId = new Map<string, string>();
    data?.forEach((v: { name: string; id: string }) =>
      venueNameToId.set(v.name, v.id),
    );

    return venueNameToId;
  }

  private async upsertEvents(
    events: Record<string, unknown>[],
  ): Promise<number> {
    if (events.length === 0) return 0;

    // Deduplicate by the conflict key to avoid "ON CONFLICT DO UPDATE command
    // cannot affect row a second time" when the scraper returns duplicate events.
    const seen = new Map<string, Record<string, unknown>>();
    for (const event of events) {
      const key = `${event.title}|${event.venue_id}|${event.start_date_time}`;
      seen.set(key, event);
    }
    const deduplicated = Array.from(seen.values());

    if (deduplicated.length < events.length) {
      this.logger.warn(
        `Removed ${events.length - deduplicated.length} duplicate events before upsert`,
      );
    }

    const { data, error } = await this.supabase
      .from(EVENTS_TABLE)
      .upsert(deduplicated, {
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
      min_age_male: venue.min_age_male,
      min_age_female: venue.min_age_female,
    };
    // Remove undefined values so they don't overwrite existing data as null
    return Object.fromEntries(
      Object.entries(row).filter(([, v]) => v !== undefined),
    );
  }

  private sanitize(value: string | null | undefined): string | null {
    if (value == null) return null;
    // Remove null bytes which PostgreSQL rejects in json/jsonb columns
    return value.replace(/\u0000/g, '');
  }

  private isUuid(value: string | undefined): value is string {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private mapEventToDbRow(
    event: Omit<Event, 'id'> & { id?: string },
    dbVenueId: string,
  ): Record<string, unknown> {
    return {
      venue_id: dbVenueId,
      title: this.sanitize(event.title),
      description: this.sanitize(event.description),
      start_date_time: event.start_date_time,
      end_date_time: event.end_date_time,
      tags: (event.tags?.map((t) => t.replace(/\u0000/g, '')) ?? []).slice(
        0,
        3,
      ),
      picture_url: event.picture,
      status: event.status,
      scraper: event.scraper ?? null,
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
    { id: string; name: string; instagram_handle?: string }[]
  > {
    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .select(
        'id, name, venue_contacts!venues_contact_id_fkey(instagram_handle)',
      );

    if (error) {
      this.logger.error('Error fetching venues:', error.message);
      throw new Error(`Failed to fetch venues: ${error.message}`);
    }

    return (
      (data as {
        id: string;
        name: string;
        venue_contacts: { instagram_handle?: string } | null;
      }[]) ?? []
    ).map((v) => ({
      id: v.id,
      name: v.name,
      instagram_handle: v.venue_contacts?.instagram_handle ?? undefined,
    }));
  }

  async fetchVenuesWithInstagramByScraper(scraper: string): Promise<
    {
      id: string;
      name: string;
      picture_url: string | null;
      instagram_handle: string;
    }[]
  > {
    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .select(
        'id, name, picture_url, venue_contacts!venues_contact_id_fkey(instagram_handle)',
      )
      .eq('scraper', scraper);

    if (error) {
      this.logger.error(
        `Error fetching venues for scraper "${scraper}":`,
        error.message,
      );
      throw new Error(`Failed to fetch venues: ${error.message}`);
    }

    return (
      (data as {
        id: string;
        name: string;
        picture_url: string | null;
        venue_contacts: { instagram_handle?: string } | null;
      }[]) ?? []
    )
      .filter((v) => !!v.venue_contacts?.instagram_handle)
      .map((v) => ({
        id: v.id,
        name: v.name,
        picture_url: v.picture_url,
        instagram_handle: v.venue_contacts!.instagram_handle!,
      }));
  }

  async createVenue(venue: Omit<Venue, 'id'>): Promise<string> {
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

    return (data as { id: string }).id;
  }

  async upsertVenueContactById(
    venueId: string,
    contact: import('../scrape/interfaces/venue.interface').VenueContact,
  ): Promise<boolean> {
    if (!contact.phone_number && !contact.instagram_handle) return false;

    const { data: existingVenue } = await this.supabase
      .from('venues')
      .select('contact_id')
      .eq('id', venueId)
      .single();

    const existingContactId =
      (existingVenue as { contact_id: string | null } | null)?.contact_id ??
      null;

    if (existingContactId) {
      const { error } = await this.supabase
        .from('venue_contacts')
        .update({
          phone_number: contact.phone_number,
          is_phone: contact.is_phone,
          is_viber: contact.is_viber,
          is_sms: contact.is_sms,
          is_whatsapp: contact.is_whatsapp,
          is_instagram: contact.is_instagram ?? false,
          instagram_handle: contact.instagram_handle ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingContactId);
      if (error) {
        this.logger.warn(
          `Failed to update venue_contact for venue ${venueId}: ${error.message}`,
        );
      }
      return false;
    } else {
      const { data: newContact, error: insertError } = await this.supabase
        .from('venue_contacts')
        .insert({
          phone_number: contact.phone_number,
          is_phone: contact.is_phone,
          is_viber: contact.is_viber,
          is_sms: contact.is_sms,
          is_whatsapp: contact.is_whatsapp,
          is_instagram: contact.is_instagram ?? false,
          instagram_handle: contact.instagram_handle ?? null,
        })
        .select('id')
        .single();
      if (insertError || !newContact) {
        this.logger.warn(
          `Failed to insert venue_contact for venue ${venueId}: ${insertError?.message}`,
        );
        return false;
      }
      const contactId = (newContact as { id: string }).id;
      const { error: linkError } = await this.supabase
        .from('venues')
        .update({ contact_id: contactId })
        .eq('id', venueId);
      if (linkError) {
        this.logger.warn(
          `Failed to link venue_contact to venue ${venueId}: ${linkError.message}`,
        );
      }
      return true;
    }
  }

  async updateVenuePicture(venueId: string, pictureUrl: string): Promise<void> {
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
    events: (Omit<Event, 'id'> & { id?: string })[],
    venueId: string,
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
