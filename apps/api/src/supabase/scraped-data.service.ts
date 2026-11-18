import { Injectable, Logger } from '@nestjs/common';
import { ScrapedEvent, ScrapedVenue } from '../scrape/domain/scraper.interface';
import {
  isUuid,
  mapScrapedEventToDbRow,
  mapScrapedVenueToDbRow,
  normalizeEventUpsertRow,
  normalizeVenueName,
  toCamelCase,
} from './scraped-rows';
import { SupabaseService } from './supabase.service';

const VENUES_TABLE = 'venues';
const EVENTS_TABLE = 'events';

/**
 * What the scrapers read from and write to the database: the venues and
 * events new data is checked against, and the venues, venue contacts and
 * events a scrape saves.
 */
@Injectable()
export class ScrapedDataService {
  private readonly logger = new Logger(ScrapedDataService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  async saveScrapedData(data: {
    venues: ScrapedVenue[];
    events: ScrapedEvent[];
  }): Promise<{ venues: number; events: number }> {
    this.logger.log(
      `Saving scraped data: ${data.venues.length} venues, ${data.events.length} events`,
    );

    // 1. Upsert venues and get back their DB IDs (always runs)
    const venueNameToId = await this.upsertScrapedVenues(data.venues);
    const savedVenuesCount = venueNameToId.size;

    // If all scraped venues were filtered as duplicates, events still need
    // to resolve to already existing DB venues.
    await this.fillMissingVenueIdsFromExistingVenues(
      data.events,
      venueNameToId,
    );

    // 1b. Upsert contacts only when SCRAPE_VENUE_CONTACTS=true
    if (process.env.SCRAPE_VENUE_CONTACTS === 'true') {
      await this.upsertScrapedVenueContacts(data.venues, venueNameToId);
    } else {
      this.logger.debug(
        'Skipping venue contact upsert (SCRAPE_VENUE_CONTACTS is not "true")',
      );
    }

    // 2. Map events to use real DB venue IDs via the venue embedded in each event
    const mappedEvents: Record<string, unknown>[] = [];
    for (const event of data.events) {
      const dbVenueId =
        venueNameToId.get(normalizeVenueName(event.venue.name)) ??
        (isUuid(event.venueId) ? event.venueId : undefined);
      if (!dbVenueId) {
        this.logger.warn(
          `Skipping event "${event.title}" - no matching venue found (venue: ${event.venue.name})`,
        );
        continue;
      }
      mappedEvents.push(mapScrapedEventToDbRow(event, dbVenueId));
    }

    // 3. Upsert events
    const savedEventsCount = await this.upsertEvents(mappedEvents);

    this.logger.log(
      `Saved ${savedVenuesCount} venues and ${savedEventsCount} events`,
    );

    return { venues: savedVenuesCount, events: savedEventsCount };
  }

  private async fillMissingVenueIdsFromExistingVenues(
    events: ScrapedEvent[],
    venueNameToId: Map<string, string>,
  ): Promise<void> {
    const unresolvedEvents = events.filter((event) => {
      const normalizedVenueName = normalizeVenueName(event.venue?.name);

      return (
        normalizedVenueName.length > 0 &&
        !venueNameToId.has(normalizedVenueName) &&
        !isUuid(event.venueId)
      );
    });

    if (unresolvedEvents.length === 0) {
      return;
    }

    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .select('id, name');

    if (error) {
      this.logger.error(
        'Error fetching existing venues for event mapping:',
        error.message,
      );
      throw new Error(
        `Failed to fetch existing venues for event mapping: ${error.message}`,
      );
    }

    for (const venue of (data as { id: string; name: string }[] | null) ?? []) {
      const normalizedName = normalizeVenueName(venue.name);

      if (!normalizedName) {
        continue;
      }

      if (!venueNameToId.has(normalizedName)) {
        venueNameToId.set(normalizedName, venue.id);
      }
    }

    this.logger.debug(
      `Loaded ${data?.length ?? 0} existing venues to resolve ${unresolvedEvents.length} events`,
    );
  }

  private async upsertScrapedVenues(
    venues: ScrapedVenue[],
  ): Promise<Map<string, string>> {
    const validVenues = venues.filter((venue) => venue.name?.trim());
    const dbRows = validVenues.map((venue) => mapScrapedVenueToDbRow(venue));

    const gooutVenueNames = Array.from(
      new Set(
        validVenues
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
      venueNameToId.set(normalizeVenueName(v.name), v.id),
    );

    return venueNameToId;
  }

  private async upsertScrapedVenueContacts(
    venues: ScrapedVenue[],
    venueNameToId: Map<string, string>,
  ): Promise<void> {
    for (const venue of venues) {
      if (!venue.venueContacts) continue;
      const venueId = venueNameToId.get(normalizeVenueName(venue.name));
      if (!venueId) continue;

      if (
        !venue.venueContacts.phoneNumber &&
        !venue.venueContacts.instagramHandle
      )
        continue;

      const { data: existingVenue } = await this.supabase
        .from('venues')
        .select('contact_id')
        .eq('id', venueId)
        .single();

      let contactId: string | null =
        (existingVenue as { contact_id: string | null } | null)?.contact_id ??
        null;

      if (contactId) {
        const { error } = await this.supabase
          .from('venue_contacts')
          .update({
            phone_number: venue.venueContacts.phoneNumber,
            is_phone: venue.venueContacts.isPhone,
            is_viber: venue.venueContacts.isViber,
            is_sms: venue.venueContacts.isSms,
            is_whatsapp: venue.venueContacts.isWhatsapp,
            is_instagram: venue.venueContacts.isInstagram ?? false,
            instagram_handle: venue.venueContacts.instagramHandle ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
        if (error) {
          this.logger.warn(
            `Failed to update venue_contact for venue ${venue.name}: ${error.message}`,
          );
        }
      } else {
        const { data: newContact, error: insertError } = await this.supabase
          .from('venue_contacts')
          .insert({
            phone_number: venue.venueContacts.phoneNumber,
            is_phone: venue.venueContacts.isPhone,
            is_viber: venue.venueContacts.isViber,
            is_sms: venue.venueContacts.isSms,
            is_whatsapp: venue.venueContacts.isWhatsapp,
            is_instagram: venue.venueContacts.isInstagram ?? false,
            instagram_handle: venue.venueContacts.instagramHandle ?? null,
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

  private async upsertEvents(
    events: Record<string, unknown>[],
  ): Promise<number> {
    if (events.length === 0) return 0;

    const normalizedEvents = events
      .map((event) => {
        const row = normalizeEventUpsertRow(event);
        if (!row) this.logger.warn('Skipping invalid event row before upsert.');
        return row;
      })
      .filter((event): event is Record<string, unknown> => event !== null);

    if (normalizedEvents.length === 0) {
      this.logger.warn(
        'No valid events remain after normalization; skipping upsert.',
      );
      return 0;
    }

    // Deduplicate by the conflict key to avoid "ON CONFLICT DO UPDATE command
    // cannot affect row a second time" when the scraper returns duplicate events.
    const seen = new Map<string, Record<string, unknown>>();
    for (const event of normalizedEvents) {
      const title = typeof event.title === 'string' ? event.title : '';
      const venueId = typeof event.venue_id === 'string' ? event.venue_id : '';
      const startDateTime =
        typeof event.start_date_time === 'string' ? event.start_date_time : '';
      const key = [title, venueId, startDateTime].join('|');
      seen.set(key, event);
    }
    const deduplicated = Array.from(seen.values());

    if (deduplicated.length < normalizedEvents.length) {
      this.logger.warn(
        `Removed ${normalizedEvents.length - deduplicated.length} duplicate events before upsert`,
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

  async getExistingVenuesWithContacts(): Promise<Array<any>> {
    const { data, error } = await this.supabase
      .from(VENUES_TABLE)
      .select('*, venue_contacts!venues_contact_id_fkey(*)');

    if (error) {
      this.logger.error('Error fetching existing venues:', error.message);
      throw new Error(`Failed to fetch existing venues: ${error.message}`);
    }

    return toCamelCase<Array<any>>(data ?? []);
  }

  async getExistingEvents(): Promise<any[]> {
    const { data, error } = await this.supabase.from(EVENTS_TABLE).select('*');

    if (error) {
      this.logger.error('Error fetching existing events:', error.message);
      throw new Error(`Failed to fetch existing events: ${error.message}`);
    }
    return data ?? [];
  }
}
