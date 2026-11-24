import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { withUtcEventTimes } from '../common/db-timestamp';
import { assertStoredPictureUrl } from '../common/stored-picture-url';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';

const EVENTS_TABLE = 'events';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** The host dashboard's event routes: a host's own events and their images. */
@Injectable()
export class EventsCrudService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /** GET /events — user's events */
  async getEvents(userId: string, venueId?: string, status?: string) {
    const { data: venues, error: venuesError } = await this.db
      .from('venues')
      .select('id')
      .eq('host_id', userId);
    if (venuesError) throw venuesError;
    if (!venues || venues.length === 0) return [];

    const venueIds = venues.map((v) => v.id as string);
    let query = this.db.from(EVENTS_TABLE).select('*').in('venue_id', venueIds);
    if (venueId) query = query.eq('venue_id', venueId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(withUtcEventTimes);
  }

  /** GET /events/:id */
  async getEventById(eventId: string) {
    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .select('*')
      .eq('id', eventId)
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException('Event not found');
    return withUtcEventTimes(data);
  }

  /** POST /events */
  async createEvent(
    userId: string,
    eventData: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    const venueId = eventData.venue_id as string;
    await this.assertVenueOwnership(venueId, userId);

    let pictureUrl: string | null = null;
    if (imageFile) {
      const key = this.buildImageKey(userId, venueId, imageFile.originalname);
      pictureUrl = await this.r2Service.uploadAndProcessImage(
        imageFile.buffer,
        key,
        500,
        375,
      );
    }

    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .insert({ ...eventData, picture_url: pictureUrl })
      .select()
      .single();
    if (error) throw error;
    return withUtcEventTimes(data);
  }

  /** PATCH /events/:id */
  async updateEvent(
    eventId: string,
    userId: string,
    updates: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    const event = await this.assertEventOwnership(eventId, userId);

    if (imageFile) {
      if (event.picture_url) {
        const oldKey = this.r2Service.extractKeyFromUrl(
          event.picture_url as string,
        );
        if (oldKey) await this.r2Service.deleteObject(oldKey).catch(() => null);
      }
      const key = this.buildImageKey(
        userId,
        String((event as Record<string, unknown>).venue_id ?? 'event'),
        imageFile.originalname,
      );
      updates.picture_url = await this.r2Service.uploadAndProcessImage(
        imageFile.buffer,
        key,
        500,
        375,
      );
    } else {
      assertStoredPictureUrl(
        this.r2Service,
        updates.picture_url,
        event.picture_url as string | null,
      );
    }

    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();
    if (error) throw error;
    return withUtcEventTimes(data);
  }

  /** DELETE /events/:id */
  async deleteEvent(eventId: string, userId: string) {
    const event = await this.assertEventOwnership(eventId, userId);
    if ((event as Record<string, unknown>).picture_url) {
      const key = this.r2Service.extractKeyFromUrl(
        (event as Record<string, unknown>).picture_url as string,
      );
      if (key) await this.r2Service.deleteObject(key).catch(() => null);
    }
    const { error } = await this.db
      .from(EVENTS_TABLE)
      .delete()
      .eq('id', eventId);
    if (error) throw error;
  }

  /** POST /events/upload */
  async uploadEventImage(
    userId: string,
    venueId: string,
    file: Express.Multer.File,
  ) {
    if (file.size > MAX_FILE_SIZE)
      throw new Error('File size exceeds 5MB limit');
    if (!file.mimetype.startsWith('image/'))
      throw new Error('File must be an image');
    await this.assertVenueOwnership(venueId, userId);

    const key = `event-images/${userId}/${venueId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
    const url = await this.r2Service.uploadAndProcessImage(
      file.buffer,
      key,
      500,
      375,
    );
    return { url, fileName: key, size: file.size, targetDimensions: '500x375' };
  }

  /** DELETE /events/upload */
  async deleteEventImage(userId: string, fileName: string) {
    const key = this.r2Service.extractKeyFromUrl(fileName) ?? fileName;
    if (!key.includes(`/${userId}/`)) {
      throw new ForbiddenException('You do not own this file');
    }
    await this.r2Service.deleteObject(key);
  }

  private async assertVenueOwnership(venueId: string, userId: string) {
    const { data: venue } = await this.db
      .from('venues')
      .select('host_id')
      .eq('id', venueId)
      .single();
    if (!venue || (venue as { host_id: string }).host_id !== userId) {
      throw new ForbiddenException('You do not own this venue');
    }
    return venue;
  }

  private async assertEventOwnership(eventId: string, userId: string) {
    const { data: event } = await this.db
      .from(EVENTS_TABLE)
      .select('venue_id, picture_url')
      .eq('id', eventId)
      .single();
    if (!event) throw new NotFoundException('Event not found');

    await this.assertVenueOwnership(
      (event as { venue_id: string }).venue_id,
      userId,
    );
    return event;
  }

  private buildImageKey(userId: string, scope: string, _originalname: string) {
    return `event-images/${userId}/${scope}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
  }
}
