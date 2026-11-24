import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizeInstagramHandle } from './venue-picture-rules';

const VENUES_TABLE = 'venues';
const VENUE_CONTACTS_TABLE = 'venue_contacts';
const EVENTS_TABLE = 'events';

/* A picture_url that is null or empty. */
const NO_PICTURE = 'picture_url.is.null,picture_url.eq.';

export interface VenueWithoutPicture {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  scraper: string;
  contactId: string | null;
  /** The venue's Instagram handle, normalized; null when it has none. */
  instagramHandle: string | null;
}

interface VenueRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  scraper: string;
  contact_id: string | null;
  venue_contacts: VenueContactRow | VenueContactRow[] | null;
}

interface VenueContactRow {
  instagram_handle: string | null;
}

/** The venue picture job's reads and writes. */
@Injectable()
export class VenuePicturesDataService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * Imported venues without a picture. Venues hosts created themselves are
   * left to their hosts, who upload a picture in the dashboard.
   */
  async fetchScrapedVenuesWithoutPicture(): Promise<VenueWithoutPicture[]> {
    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .select(
        'id, name, latitude, longitude, scraper, contact_id, venue_contacts!venues_contact_id_fkey(instagram_handle)',
      )
      .not('scraper', 'is', null)
      .or(NO_PICTURE);

    if (error) {
      throw new Error(
        `Failed to fetch venues without a picture: ${error.message}`,
      );
    }

    return ((data as unknown as VenueRow[] | null) ?? []).map((row) => {
      // The contact comes back as an object, typed as a list.
      const contact = Array.isArray(row.venue_contacts)
        ? row.venue_contacts[0]
        : row.venue_contacts;

      return {
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        scraper: row.scraper,
        contactId: row.contact_id,
        instagramHandle: normalizeInstagramHandle(contact?.instagram_handle),
      };
    });
  }

  /** The venues with an active event that hasn't ended. */
  async fetchVenueIdsWithUpcomingEvents(): Promise<Set<string>> {
    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .select('venue_id')
      .eq('status', 'active')
      .gte('end_date_time', new Date().toISOString());

    if (error) {
      throw new Error(`Failed to fetch upcoming events: ${error.message}`);
    }

    return new Set(
      ((data as { venue_id: string }[] | null) ?? []).map(
        (row) => row.venue_id,
      ),
    );
  }

  /** Every Instagram handle a venue contact has, normalized. */
  async fetchInstagramHandlesInUse(): Promise<Set<string>> {
    const { data, error } = await this.db
      .from(VENUE_CONTACTS_TABLE)
      .select('instagram_handle')
      .not('instagram_handle', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch Instagram handles: ${error.message}`);
    }

    return new Set(
      ((data as { instagram_handle: string }[] | null) ?? [])
        .map((row) => normalizeInstagramHandle(row.instagram_handle))
        .filter((handle): handle is string => handle !== null),
    );
  }

  /**
   * Sets the venue's picture unless it got one meanwhile (a host's upload),
   * and says whether it did.
   */
  async setPictureIfMissing(
    venueId: string,
    pictureUrl: string,
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .update({ picture_url: pictureUrl })
      .eq('id', venueId)
      .or(NO_PICTURE)
      .select('id');

    if (error) {
      throw new Error(
        `Failed to save the picture of venue ${venueId}: ${error.message}`,
      );
    }

    return (data?.length ?? 0) > 0;
  }

  /**
   * Gives the venue an Instagram handle: on its contact when it has one, or
   * on a new contact linked to it. A handle the contact already has is kept.
   */
  async saveInstagramHandle(
    venue: { id: string; contactId: string | null },
    handle: string,
  ): Promise<void> {
    if (venue.contactId) {
      const { error } = await this.db
        .from(VENUE_CONTACTS_TABLE)
        .update({
          instagram_handle: handle,
          is_instagram: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venue.contactId)
        .or('instagram_handle.is.null,instagram_handle.eq.');

      if (error) {
        throw new Error(
          `Failed to save @${handle} on venue ${venue.id}: ${error.message}`,
        );
      }
      return;
    }

    const { data: contact, error: insertError } = await this.db
      .from(VENUE_CONTACTS_TABLE)
      .insert({
        phone_number: '',
        is_instagram: true,
        instagram_handle: handle,
      })
      .select('id')
      .single<{ id: string }>();

    if (insertError || !contact) {
      throw new Error(
        `Failed to create a contact with @${handle} for venue ${venue.id}: ${insertError?.message}`,
      );
    }

    const contactId = contact.id;
    const { data: linked, error: linkError } = await this.db
      .from(VENUES_TABLE)
      .update({ contact_id: contactId })
      .eq('id', venue.id)
      .is('contact_id', null)
      .select('id');

    if (linkError || !linked?.length) {
      // The venue got a contact meanwhile, or the link failed: don't leave
      // ours unattached.
      await this.db.from(VENUE_CONTACTS_TABLE).delete().eq('id', contactId);
    }

    if (linkError) {
      throw new Error(
        `Failed to link @${handle} to venue ${venue.id}: ${linkError.message}`,
      );
    }
  }
}
