import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FavoritesService } from '../favorites/favorites.service';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GetActiveEventsDto } from './dto/get-active-events.dto';

const EVENTS_TABLE = 'events';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class EventsCrudService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
    private readonly favoritesService: FavoritesService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /** GET /events/active — public, no auth required */
  async getActiveEvents(filters: GetActiveEventsDto = {}, userId?: string) {
    const venueTypes = filters.venue_type
      ? filters.venue_type
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

    const now = new Date().toISOString();
    const tenDaysFromNow = new Date(
      Date.now() + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let eventsQuery = this.db
      .from(EVENTS_TABLE)
      .select(
        'id, title, picture_url, scraper, venue_id, start_date_time, tags',
      )
      .eq('status', 'active')
      .gte('end_date_time', now);

    // Date range filter
    if (filters.date_start) {
      eventsQuery = eventsQuery.gte('start_date_time', filters.date_start);
    } else {
      eventsQuery = eventsQuery.lte('start_date_time', tenDaysFromNow);
    }
    if (filters.date_end) {
      eventsQuery = eventsQuery.lte('start_date_time', filters.date_end);
    }

    eventsQuery = eventsQuery.order('start_date_time', { ascending: true });

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) throw eventsError;
    if (!events || events.length === 0) return [];

    // Fetch saved event IDs for the current user
    const effectiveUserId = userId ?? filters.user_id;
    let savedEventIds: Set<string> = new Set();
    if (effectiveUserId) {
      const { data: engagements, error: engagementsError } = await this.db
        .from('event_engagements')
        .select('event_id')
        .eq('user_id', effectiveUserId)
        .eq('engagement_type', 'saved');
      if (engagementsError) throw engagementsError;
      for (const e of engagements ?? []) {
        savedEventIds.add(e.event_id as string);
      }
    }
    const favoriteEventIds: Set<string> | null =
      filters.only_favorites === 'true' && effectiveUserId
        ? savedEventIds
        : null;

    // Optionally filter by favorites
    const uniqueEvents = events.filter((event) => {
      if (favoriteEventIds && !favoriteEventIds.has(event.id as string))
        return false;
      return true;
    });

    if (uniqueEvents.length === 0) return [];

    const venueIds = [
      ...new Set(uniqueEvents.map((e) => e.venue_id as string)),
    ];
    let venuesQuery = this.db
      .from('venues')
      .select(
        'id, name, latitude, longitude, address, capacity, venue_type, picture_url',
      )
      .in('id', venueIds);

    // Venue type filter
    if (venueTypes.length === 1) {
      venuesQuery = venuesQuery.eq('venue_type', venueTypes[0]);
    } else if (venueTypes.length > 1) {
      venuesQuery = venuesQuery.in('venue_type', venueTypes);
    }
    // Capacity filter
    if (filters.capacity_min !== undefined) {
      venuesQuery = venuesQuery.gte('capacity', Number(filters.capacity_min));
    }
    if (filters.capacity_max !== undefined) {
      venuesQuery = venuesQuery.lte('capacity', Number(filters.capacity_max));
    }

    const { data: venues, error: venuesError } = await venuesQuery;
    if (venuesError) throw venuesError;

    // Fetch guest counts per event
    const eventIds = uniqueEvents.map((e) => e.id as string);
    const { data: ticketCounts, error: ticketCountsError } = await this.db
      .from('tickets')
      .select('event_id')
      .in('event_id', eventIds);
    if (ticketCountsError) throw ticketCountsError;
    const guestCountMap = new Map<string, number>();
    for (const t of ticketCounts ?? []) {
      const id = t.event_id as string;
      guestCountMap.set(id, (guestCountMap.get(id) ?? 0) + 1);
    }

    const venueMap = new Map(venues?.map((v) => [v.id as string, v]) ?? []);

    return uniqueEvents
      .map((event) => {
        const venue = venueMap.get(event.venue_id as string);
        if (!venue) return null;
        return {
          id: event.id as string,
          name: event.title,
          picture:
            (event.scraper as string) === 'goout'
              ? ((venue as Record<string, unknown>).picture_url ??
                event.picture_url)
              : event.picture_url,
          venue_name: venue.name,
          address: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
          date: event.start_date_time,
          tags: (event.tags as string[]) ?? [],
          isFavorite: savedEventIds.has(event.id as string),
          guest_count: guestCountMap.get(event.id as string) ?? 0,
        };
      })
      .filter(Boolean);
  }

  /** GET /events/active/:id — full event details for a single event */
  async getActiveEventById(eventId: string, userId?: string) {
    const { data: event, error: eventError } = await this.db
      .from(EVENTS_TABLE)
      .select(
        'id, title, description, picture_url, scraper, venue_id, start_date_time, tags',
      )
      .eq('id', eventId)
      .eq('status', 'active')
      .single();
    if (eventError || !event) throw new NotFoundException('Event not found');

    // Fetch venue with contact info
    const { data: venue, error: venueError } = await this.db
      .from('venues')
      .select(
        'id, name, latitude, longitude, address, picture_url, contact_id, requires_reservation',
      )
      .eq('id', (event as Record<string, unknown>).venue_id as string)
      .single();
    if (venueError || !venue) throw new NotFoundException('Venue not found');

    const venueTyped = venue as Record<string, unknown>;

    // Fetch contact if present
    let contact: Record<string, unknown> | null = null;
    if (venueTyped.contact_id) {
      const { data: c } = await this.db
        .from('venue_contacts')
        .select(
          'id, phone_number, is_viber, is_phone, is_sms, is_whatsapp, is_instagram, instagram_handle',
        )
        .eq('id', venueTyped.contact_id as string)
        .single();
      contact = (c as Record<string, unknown> | null) ?? null;
    }

    // Fetch user engagement
    let isFavorite = false;
    let isSeen = false;
    let isAttending = false;
    if (userId) {
      const { data: engagements } = await this.db
        .from('event_engagements')
        .select('engagement_type')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .in('engagement_type', ['saved', 'seen']);
      for (const e of engagements ?? []) {
        if (e.engagement_type === 'saved') isFavorite = true;
        if (e.engagement_type === 'seen') isSeen = true;
      }
      const { data: ticket } = await this.db
        .from('tickets')
        .select('id')
        .eq('guest_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();
      isAttending = !!ticket;

      // Fire-and-forget: mark event as seen for this user
      this.favoritesService.trackSeen(userId, eventId).catch(() => {});
    }

    return {
      id: (event as Record<string, unknown>).id as string,
      name: (event as Record<string, unknown>).title,
      address: venueTyped.address,
      latitude: venueTyped.latitude,
      longitude: venueTyped.longitude,
      description: (event as Record<string, unknown>).description,
      picture:
        (event as Record<string, unknown>).scraper === 'goout'
          ? (venueTyped.picture_url ??
            (event as Record<string, unknown>).picture_url)
          : (event as Record<string, unknown>).picture_url,
      venue_name: venueTyped.name,
      venue_picture: venueTyped.picture_url ?? null,
      date: (event as Record<string, unknown>).start_date_time,
      tags: ((event as Record<string, unknown>).tags as string[]) ?? [],
      isFavorite,
      isSeen,
      isAttending,
      requires_reservation:
        (venueTyped.requires_reservation as boolean) ?? false,
      venue_contact: contact
        ? {
            id: contact.id,
            phone_number: contact.phone_number,
            is_viber: contact.is_viber,
            is_phone: contact.is_phone,
            is_sms: contact.is_sms,
            is_whatsapp: contact.is_whatsapp,
            is_instagram: contact.is_instagram ?? false,
            instagram_handle: contact.instagram_handle ?? null,
          }
        : null,
    };
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
    return data ?? [];
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
    return data;
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
    return data;
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
