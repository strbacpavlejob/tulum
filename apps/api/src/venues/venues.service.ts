import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InstagramVenueScraperService } from '../instagram/instagram-venue-scraper.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';

const VENUES_TABLE = 'venues';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class VenuesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
    private readonly instagramScraperService: InstagramVenueScraperService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getVenues(hostId?: string) {
    let query = this.db.from(VENUES_TABLE).select('*');
    if (hostId) query = query.eq('host_id', hostId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async getVenueById(venueId: string) {
    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .select('*')
      .eq('id', venueId)
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException('Venue not found');
    return data;
  }

  async createVenue(
    userId: string,
    venueData: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    let pictureUrl: string | null = null;
    if (imageFile) {
      const key = this.buildImageKey(userId, 'temp', imageFile.originalname);
      pictureUrl = await this.r2Service.uploadAndProcessImage(
        imageFile.buffer,
        key,
        200,
        200,
      );
    }

    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .insert({ ...venueData, host_id: userId, picture_url: pictureUrl })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateVenue(
    venueId: string,
    userId: string,
    updates: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    const venue = await this.assertOwnership(venueId, userId);

    if (imageFile) {
      if (venue.picture_url) {
        const oldKey = this.r2Service.extractKeyFromUrl(
          venue.picture_url as string,
        );
        if (oldKey) await this.r2Service.deleteObject(oldKey).catch(() => null);
      }
      const key = this.buildImageKey(userId, venueId, imageFile.originalname);
      updates.picture_url = await this.r2Service.uploadAndProcessImage(
        imageFile.buffer,
        key,
        200,
        200,
      );
    }

    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .update(updates)
      .eq('id', venueId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteVenue(venueId: string, userId: string) {
    const venue = await this.assertOwnership(venueId, userId);
    if (venue.picture_url) {
      const key = this.r2Service.extractKeyFromUrl(venue.picture_url as string);
      if (key) await this.r2Service.deleteObject(key).catch(() => null);
    }
    const { error } = await this.db
      .from(VENUES_TABLE)
      .delete()
      .eq('id', venueId);
    if (error) throw error;
  }

  async uploadVenueImage(
    userId: string,
    venueId: string | undefined,
    file: Express.Multer.File,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }
    if (venueId) {
      await this.assertOwnership(venueId, userId);
    }

    const key = venueId
      ? this.buildImageKey(userId, venueId, file.originalname)
      : `venue-images/${userId}/temp/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;

    const url = await this.r2Service.uploadAndProcessImage(
      file.buffer,
      key,
      200,
      200,
    );
    return { url, fileName: key, size: file.size, targetDimensions: '200x200' };
  }

  async deleteVenueImage(userId: string, fileName: string) {
    const key = this.r2Service.extractKeyFromUrl(fileName) ?? fileName;
    if (!key.includes(`/${userId}/`)) {
      throw new ForbiddenException('You do not own this file');
    }
    await this.r2Service.deleteObject(key);
  }

  // ─── Venue Contact ────────────────────────────────────────────────────────

  async getVenueContact(venueId: string) {
    const { data: venue, error } = await this.db
      .from(VENUES_TABLE)
      .select('contact_id')
      .eq('id', venueId)
      .single();
    if (error) throw error;
    if (!(venue as Record<string, unknown>).contact_id) return null;

    const { data: contact, error: contactError } = await this.db
      .from('venue_contacts')
      .select(
        'id, phone_number, is_viber, is_phone, is_sms, is_whatsapp, instagram_handle',
      )
      .eq('id', (venue as Record<string, unknown>).contact_id)
      .single();
    if (contactError) throw contactError;
    return contact;
  }

  async upsertVenueContact(
    venueId: string,
    userId: string,
    data: Record<string, unknown>,
  ) {
    await this.assertOwnership(venueId, userId);

    const { data: existing } = await this.db
      .from(VENUES_TABLE)
      .select('contact_id')
      .eq('id', venueId)
      .single();

    const existingContactId = (existing as Record<string, unknown>)
      ?.contact_id as string | null;

    const contactPayload = {
      phone_number: data.phone_number,
      is_viber: data.is_viber ?? false,
      is_phone: data.is_phone ?? false,
      is_sms: data.is_sms ?? false,
      is_whatsapp: data.is_whatsapp ?? false,
      instagram_handle: data.instagram_handle ?? null,
      updated_at: new Date().toISOString(),
    };

    let contactId: string;

    if (existingContactId) {
      const { data: updated, error } = await this.db
        .from('venue_contacts')
        .update(contactPayload)
        .eq('id', existingContactId)
        .select()
        .single();
      if (error) throw error;
      contactId = (updated as Record<string, unknown>).id as string;
    } else {
      const { data: created, error } = await this.db
        .from('venue_contacts')
        .insert(contactPayload)
        .select()
        .single();
      if (error) throw error;
      contactId = (created as Record<string, unknown>).id as string;

      await this.db
        .from(VENUES_TABLE)
        .update({ contact_id: contactId })
        .eq('id', venueId);
    }

    return this.getVenueContact(venueId);
  }

  async deleteVenueContact(venueId: string, userId: string) {
    await this.assertOwnership(venueId, userId);

    const { data: venue } = await this.db
      .from(VENUES_TABLE)
      .select('contact_id')
      .eq('id', venueId)
      .single();

    const contactId = (venue as Record<string, unknown>)?.contact_id as
      | string
      | null;
    if (!contactId) return;

    await this.db
      .from(VENUES_TABLE)
      .update({ contact_id: null })
      .eq('id', venueId);

    await this.db.from('venue_contacts').delete().eq('id', contactId);
  }

  async refreshInstagramPicture(venueId: string, userId: string) {
    const venue = await this.assertOwnership(venueId, userId);

    // Fetch instagram handle from venue contact
    const contact = await this.getVenueContact(venueId);
    const instagramHandle = (contact as Record<string, unknown> | null)
      ?.instagram_handle as string | null;
    if (!instagramHandle) {
      throw new NotFoundException(
        'This venue has no Instagram handle configured',
      );
    }

    // Scrape fresh profile picture URL from Instagram (bypass cache)
    const { profile } =
      await this.instagramScraperService.scrapeVenueFresh(instagramHandle);
    if (!profile.profilePictureUrl) {
      throw new NotFoundException(
        'Could not retrieve a profile picture from Instagram',
      );
    }

    // Delete old picture from R2 if exists
    if (venue.picture_url) {
      const oldKey = this.r2Service.extractKeyFromUrl(
        venue.picture_url as string,
      );
      if (oldKey) await this.r2Service.deleteObject(oldKey).catch(() => null);
    }

    // Download via Puppeteer browser context (bypasses CDN network restrictions)
    const imageBuffer = await this.instagramScraperService.downloadImageViaPage(
      profile.profilePictureUrl,
    );
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Failed to download the Instagram profile picture');
    }

    // Process and upload to R2
    const newKey = `venue-images/${userId}/${venueId}/instagram-profile.webp`;
    const newUrl = await this.r2Service.uploadAndProcessImage(
      imageBuffer,
      newKey,
      200,
      200,
    );

    // Persist the new picture URL
    const { data, error } = await this.db
      .from(VENUES_TABLE)
      .update({ picture_url: newUrl })
      .eq('id', venueId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  private async assertOwnership(venueId: string, userId: string) {
    const { data: venue } = await this.db
      .from(VENUES_TABLE)
      .select('host_id, picture_url')
      .eq('id', venueId)
      .single();
    if (!venue || (venue as { host_id: string }).host_id !== userId) {
      throw new ForbiddenException('You do not own this venue');
    }
    return venue as { host_id: string; picture_url: string | null };
  }

  private buildImageKey(userId: string, scope: string, originalname: string) {
    const ext = originalname.split('.').pop() ?? 'webp';
    void ext;
    return `venue-images/${userId}/${scope}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
  }
}
