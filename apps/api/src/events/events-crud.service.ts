import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';

const EVENTS_TABLE = 'events';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class EventsCrudService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /** GET /events/active — public, no auth required */
  async getActiveEvents() {
    const now = new Date().toISOString();
    const tenDaysFromNow = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: events, error: eventsError } = await this.db
      .from(EVENTS_TABLE)
      .select(
        'id, title, description, picture_url, venue_id, status, start_date_time, end_date_time, tags',
      )
      .eq('status', 'active')
      .lte('start_date_time', tenDaysFromNow)
      .gte('end_date_time', now)
      .order('start_date_time', { ascending: true });

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) return [];

    // Keep only the earliest event per venue
    const seenVenues = new Set<number>();
    const uniqueEvents = events.filter((event) => {
      if (seenVenues.has(event.venue_id as number)) return false;
      seenVenues.add(event.venue_id as number);
      return true;
    });

    const venueIds = [
      ...new Set(uniqueEvents.map((e) => e.venue_id as number)),
    ];
    const { data: venues, error: venuesError } = await this.db
      .from('venues')
      .select(
        'id, name, latitude, longitude, address, capacity, venue_type, picture_url',
      )
      .in('id', venueIds);

    if (venuesError) throw venuesError;

    const venueMap = new Map(venues?.map((v) => [v.id as number, v]) ?? []);

    return uniqueEvents
      .map((event) => {
        const venue = venueMap.get(event.venue_id as number);
        if (!venue) return null;
        return {
          id: event.id,
          name: event.title,
          longitude: venue.longitude,
          latitude: venue.latitude,
          type: venue.venue_type,
          capacity: venue.capacity,
          address: venue.address,
          description: event.description,
          picture: event.picture_url,
          picture_urls: venue.picture_url ? [venue.picture_url] : [],
        };
      })
      .filter(Boolean);
  }

  /** GET /events — user's events */
  async getEvents(userId: string, venueId?: string, status?: string) {
    const { data: venues, error: venuesError } = await this.db
      .from('venues')
      .select('id')
      .eq('host_id', userId);
    if (venuesError) throw venuesError;
    if (!venues || venues.length === 0) return [];

    const venueIds = venues.map((v) => v.id as number);
    let query = this.db.from(EVENTS_TABLE).select('*').in('venue_id', venueIds);
    if (venueId) query = query.eq('venue_id', parseInt(venueId, 10));
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  /** GET /events/:id */
  async getEventById(eventId: number) {
    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .select('*')
      .eq('id', eventId)
      .single();
    if (error) throw error;
    if (!data) throw new NotFoundException('Event not found');
    return data;
  }

  /** POST /events */
  async createEvent(
    userId: string,
    eventData: Record<string, unknown>,
    imageFile?: Express.Multer.File,
  ) {
    const venueId = eventData.venue_id as number;
    await this.assertVenueOwnership(venueId, userId);

    let pictureUrl: string | null = null;
    if (imageFile) {
      const key = this.buildImageKey(
        userId,
        venueId.toString(),
        imageFile.originalname,
      );
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
    return data;
  }

  /** PATCH /events/:id */
  async updateEvent(
    eventId: number,
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
    }

    const { data, error } = await this.db
      .from(EVENTS_TABLE)
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** DELETE /events/:id */
  async deleteEvent(eventId: number, userId: string) {
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
    await this.assertVenueOwnership(parseInt(venueId, 10), userId);

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

  private async assertVenueOwnership(venueId: number, userId: string) {
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

  private async assertEventOwnership(eventId: number, userId: string) {
    const { data: event } = await this.db
      .from(EVENTS_TABLE)
      .select('venue_id, picture_url')
      .eq('id', eventId)
      .single();
    if (!event) throw new NotFoundException('Event not found');

    await this.assertVenueOwnership(
      (event as { venue_id: number }).venue_id,
      userId,
    );
    return event;
  }

  private buildImageKey(userId: string, scope: string, _originalname: string) {
    return `event-images/${userId}/${scope}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.webp`;
  }
}
