import { ScraperConfig } from './scraper-config';
import { Venue } from './scraper-venue.interfaces';
import { Event } from './scraper-event.interfaces';

export interface Scraper {
  readonly config: ScraperConfig;
  scrape(): Promise<{
    venues: Omit<Venue, 'id'>[];
    events: (Omit<Event, 'id'> & { id?: string })[];
  }>;
  scrapeVenues?(): Promise<{ venues: Omit<Venue, 'id'>[] }>;
  scrapeEvents?(): Promise<{ events: (Omit<Event, 'id'> & { id?: string })[] }>;
}
