import { ScraperConfig } from './scraper-config';
import { Event } from './scraper-event.interfaces';
import { Venue } from './scraper-venue.interfaces';

export type ScrapedVenue = Omit<Venue, 'id'>;

export type ScrapedEvent = Omit<Event, 'id'> & {
  id?: string;
};

export interface ScraperResult {
  venues: ScrapedVenue[];
  events: ScrapedEvent[];
}

export interface ScrapedVenuesResult {
  venues: ScrapedVenue[];
}

export interface ScrapedEventsResult {
  events: ScrapedEvent[];
}

export interface Scraper<
  TMapVenueArgs extends unknown[] = unknown[],
  TMapEventArgs extends unknown[] = unknown[],
> {
  readonly config: ScraperConfig;

  scrape(): Promise<ScraperResult>;

  scrapeVenues?(): Promise<ScrapedVenuesResult>;

  scrapeEvents?(): Promise<ScrapedEventsResult>;

  mapVenue(...args: TMapVenueArgs): ScrapedVenue;

  mapEvent(...args: TMapEventArgs): ScrapedEvent;
}
