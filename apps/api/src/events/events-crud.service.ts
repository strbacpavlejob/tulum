import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  parseDbTimestampMs,
  toUtcIsoString,
  withUtcEventTimes,
} from '../common/db-timestamp';
import { countTicketsByEvent } from '../common/ticket-counts';
import { FavoritesService } from '../favorites/favorites.service';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GetActiveEventsDto } from './dto/get-active-events.dto';

const EVENTS_TABLE = 'events';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
/**
 * How long the feed and event details are cached, in seconds. Only what is
 * the same for every caller is cached; favorites, seen and attending are
 * read for each request.
 */
const ACTIVE_EVENTS_CACHE_SECONDS = 45;

/** One event in the feed, before the caller's favorites are known. */
interface FeedEvent {
  id: string;
  name: string;
  picture: string | null;
  venue_name: string;
  venue_id: string;
  address: string;
  latitude: number;
  longitude: number;
  date: string | null;
  tags: string[];
  guest_count: number;
}

interface FeedVenue {
  id: string;
  name: string;
  picture_url: string | null;
  address: string;
  latitude: number;
  longitude: number;
}

/** The cached part of GET /events/active. */
interface SharedFeed {
  /** Every event the date filters found, venue filters aside. */
  eventIds: string[];
  /** Those events whose venue passes the venue filters, in start order. */
  events: FeedEvent[];
  venues: Record<string, FeedVenue>;
}

/** The cached part of GET /events/active/:id. */
interface SharedEventDetails {
  event: Record<string, unknown>;
  venue: Record<string, unknown>;
  contact: Record<string, unknown> | null;
}

/**
 * One pin per venue, in the order of its first listed event; instances is
 * how many listed events are there. A pin per event stacked a duplicate
 * marker on the venue for each of its events.
 */
function feedPins(events: FeedEvent[], venues: Record<string, FeedVenue>) {
  const instances = new Map<string, number>();
  for (const event of events) {
    instances.set(event.venue_id, (instances.get(event.venue_id) ?? 0) + 1);
  }
  return [...instances].map(([venueId, count]) => {
    const venue = venues[venueId];
    return {
      id: venue.id,
      name: venue.name,
      picture: venue.picture_url,
      venue_name: venue.name,
      venue_id: venue.id,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      instances: count,
    };
  });
}

/**
 * A date_start or date_end value in milliseconds. Like the events columns, a
 * value without an offset is UTC; Date.parse covers offsets without a colon
 * (+0200). Postgres ignores the offset when it compares a value with these
 * columns, so the query gets the instant in UTC instead.
 */
function parseRangeBound(value: string, name: string): number {
  const ms = parseDbTimestampMs(value) ?? Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new BadRequestException(
      `${name} must be a valid ISO 8601 date string`,
    );
  }
  return ms;
}

@Injectable()
export class EventsCrudService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
    private readonly favoritesService: FavoritesService,
    private readonly redis: RedisService,
  ) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  /**
   * GET /events/active — public, no auth required. userId is the verified
   * caller, if any; favorites are never looked up for anyone else.
   */
  async getActiveEvents(filters: GetActiveEventsDto = {}, userId?: string) {
    const venueTypes = filters.venue_type
      ? [
          ...new Set(
            filters.venue_type
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ].sort()
      : [];
    const rangeStart = filters.date_start
      ? parseRangeBound(filters.date_start, 'date_start')
      : null;
    const rangeEnd = filters.date_end
      ? parseRangeBound(filters.date_end, 'date_end')
      : null;
    const capacityMin =
      filters.capacity_min !== undefined ? Number(filters.capacity_min) : null;
    const capacityMax =
      filters.capacity_max !== undefined ? Number(filters.capacity_max) : null;

    const sharedKey = `events:active:v1:${JSON.stringify([
      venueTypes,
      capacityMin,
      capacityMax,
      rangeStart,
      rangeEnd,
    ])}`;
    const [shared, savedEventIds] = await Promise.all([
      this.redis.remember(sharedKey, ACTIVE_EVENTS_CACHE_SECONDS, () =>
        this.loadSharedFeed(
          venueTypes,
          capacityMin,
          capacityMax,
          rangeStart,
          rangeEnd,
        ),
      ),
      userId ? this.savedEventIds(userId) : new Set<string>(),
    ]);
    if (shared.eventIds.length === 0) return [];

    let listed = shared.events;
    if (filters.only_favorites === 'true' && userId) {
      if (!shared.eventIds.some((id) => savedEventIds.has(id))) return [];
      listed = listed.filter((event) => savedEventIds.has(event.id));
    }

    const eventsListing = listed.map((event) => ({
      ...event,
      isFavorite: savedEventIds.has(event.id),
    }));
    return {
      events: eventsListing,
      pins: feedPins(listed, shared.venues),
    };
  }

  /** The ids of the events the user saved (favorited). */
  private async savedEventIds(userId: string): Promise<Set<string>> {
    const { data, error } = await this.db
      .from('event_engagements')
      .select('event_id')
      .eq('user_id', userId)
      .eq('engagement_type', 'saved');
    if (error) throw error;
    return new Set((data ?? []).map((e) => e.event_id as string));
  }

  /** The feed as every caller sees it, favorites aside. */
  private async loadSharedFeed(
    venueTypes: string[],
    capacityMin: number | null,
    capacityMax: number | null,
    rangeStart: number | null,
    rangeEnd: number | null,
  ): Promise<SharedFeed> {
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const tenDaysFromNow = new Date(
      nowMs + 10 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let eventsQuery = this.db
      .from(EVENTS_TABLE)
      .select(
        'id, title, picture_url, scraper, venue_id, start_date_time, tags',
      )
      .eq('status', 'active')
      .gte('end_date_time', now);

    // Date range filter: events that start within the range. Once the range
    // has begun, events that started before it and are still on are kept,
    // so a range starting today doesn't hide live events.
    if (rangeStart === null) {
      eventsQuery = eventsQuery.lte('start_date_time', tenDaysFromNow);
    } else if (rangeStart > nowMs) {
      eventsQuery = eventsQuery.gte(
        'start_date_time',
        new Date(rangeStart).toISOString(),
      );
    }
    if (rangeEnd !== null) {
      eventsQuery = eventsQuery.lte(
        'start_date_time',
        new Date(rangeEnd).toISOString(),
      );
    }

    eventsQuery = eventsQuery.order('start_date_time', { ascending: true });

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return { eventIds: [], events: [], venues: {} };
    }

    const venueIds = [...new Set(events.map((e) => e.venue_id as string))];
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
    if (capacityMin !== null) {
      venuesQuery = venuesQuery.gte('capacity', capacityMin);
    }
    if (capacityMax !== null) {
      venuesQuery = venuesQuery.lte('capacity', capacityMax);
    }

    const { data: venues, error: venuesError } = await venuesQuery;
    if (venuesError) throw venuesError;

    // Guests going per event
    const eventIds = events.map((e) => e.id as string);
    const guestCountMap = await countTicketsByEvent(this.db, eventIds);

    const venueMap = new Map(venues?.map((v) => [v.id as string, v]) ?? []);
    const listedVenues: Record<string, FeedVenue> = {};

    const listing = events.flatMap((event): FeedEvent[] => {
      const venue = venueMap.get(event.venue_id as string);
      if (!venue) return [];
      listedVenues[venue.id as string] = {
        id: venue.id as string,
        name: venue.name as string,
        picture_url: (venue.picture_url as string | null) ?? null,
        address: venue.address as string,
        latitude: venue.latitude as number,
        longitude: venue.longitude as number,
      };
      return [
        {
          id: event.id as string,
          name: event.title as string,
          picture:
            (event as Record<string, string>).picture_url ??
            (venue as Record<string, string>).picture_url,
          venue_name: venue.name as string,
          venue_id: venue.id as string,
          address: venue.address as string,
          latitude: venue.latitude as number,
          longitude: venue.longitude as number,
          date: toUtcIsoString(event.start_date_time),
          tags: (event.tags as string[]) ?? [],
          guest_count: guestCountMap.get(event.id as string) ?? 0,
        },
      ];
    });

    return { eventIds, events: listing, venues: listedVenues };
  }

  /** GET /events/active/:id — full event details for a single event */
  async getActiveEventById(eventId: string, userId?: string) {
    const [shared, goingCount, viewer] = await Promise.all([
      this.redis.remember(
        `events:active:detail:v1:${eventId}`,
        ACTIVE_EVENTS_CACHE_SECONDS,
        () => this.loadSharedEventDetails(eventId),
      ),
      // Everyone going, counted fresh so a guest who just joined is in it.
      // The event page a QR code opens shows it before sign-in.
      this.countGoing(eventId),
      userId ? this.viewerEngagement(eventId, userId) : null,
    ]);
    const { event, venue, contact } = shared;

    // Fire-and-forget: mark event as seen for this user
    if (userId) {
      this.favoritesService.trackSeen(userId, eventId).catch(() => {});
    }

    return {
      id: event.id as string,
      name: event.title,
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      description: event.description,
      picture: event.picture_url ?? venue.picture_url,
      venue_name: venue.name,
      venue_picture: venue.picture_url ?? null,
      date: toUtcIsoString(event.start_date_time),
      end_date_time: toUtcIsoString(event.end_date_time),
      going_count: goingCount,
      tags: (event.tags as string[]) ?? [],
      isFavorite: viewer?.isFavorite ?? false,
      isSeen: viewer?.isSeen ?? false,
      isAttending: viewer?.isAttending ?? false,
      requires_reservation: (venue.requires_reservation as boolean) ?? false,
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

  /** An active event with its venue and the venue's contact, or a 404. */
  private async loadSharedEventDetails(
    eventId: string,
  ): Promise<SharedEventDetails> {
    const { data: event, error: eventError } = await this.db
      .from(EVENTS_TABLE)
      .select(
        'id, title, description, picture_url, scraper, venue_id, start_date_time, end_date_time, tags',
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

    return { event, venue: venueTyped, contact };
  }

  /** How many guests are going to the event. */
  private async countGoing(eventId: string): Promise<number> {
    const { count, error } = await this.db
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);
    if (error) throw error;
    return count ?? 0;
  }

  /** Whether the user saved, has seen and is going to the event. */
  private async viewerEngagement(eventId: string, userId: string) {
    const [{ data: engagements }, { data: ticket }] = await Promise.all([
      this.db
        .from('event_engagements')
        .select('engagement_type')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .in('engagement_type', ['saved', 'seen']),
      this.db
        .from('tickets')
        .select('id')
        .eq('guest_id', userId)
        .eq('event_id', eventId)
        .maybeSingle(),
    ]);
    const types = new Set(
      (engagements ?? []).map((e) => e.engagement_type as string),
    );
    return {
      isFavorite: types.has('saved'),
      isSeen: types.has('seen'),
      isAttending: !!ticket,
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
