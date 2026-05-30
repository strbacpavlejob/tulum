import { GoEvent } from '../interfaces/go-event.interface';
import { Event } from '../interfaces/event.interface';
import { Venue, VenueType } from '../interfaces/venue.interface';

const DEFAULT_EVENT_DURATION_HOURS = 4;
const DEFAULT_VENUE_CAPACITY = 100;

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapGoEventToVenue(
  goEvent: GoEvent,
  venueType: VenueType,
): Omit<Venue, 'id'> {
  return {
    host_id: process.env.DEFAULT_VENUE_HOST_ID || 'user_test',
    name: goEvent.host,
    longitude: goEvent.longitude,
    latitude: goEvent.latitude,
    type: venueType,
    capacity: DEFAULT_VENUE_CAPACITY,
    address: goEvent.location_name,
    description: stripHtml(goEvent.description),
    picture: goEvent.image_url || goEvent.thumb_url,
    picture_urls: [goEvent.image_url, goEvent.thumb_url].filter(Boolean),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scraper: 'goout',
  };
}

export function mapGoEventToEvent(
  goEvent: GoEvent,
  venueId: number,
): Omit<Event, 'id'> & { id?: string } {
  const startDate = new Date(goEvent.start_timestamp);
  const endDate = new Date(
    startDate.getTime() + DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000,
  );

  return {
    venue_id: venueId.toString(),
    title: goEvent.name,
    description: stripHtml(goEvent.description),
    start_date_time: startDate.toISOString(),
    end_date_time: endDate.toISOString(),
    tags: (goEvent.tags?.map((tag) => tag.name) ?? []).slice(0, 3),
    picture: goEvent.image_url || goEvent.thumb_url,
    status: 'active',
    scraper: 'goout',
    tickets_sold: 0,
    venue_name: goEvent.host,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
