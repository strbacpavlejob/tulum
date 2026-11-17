/**
 * ScraperService runs a scraper, drops what the DB already has and saves the
 * rest. The DB's venues come camelCased with their contact, whose Instagram
 * account ties an Event Zeka venue to the one another source saved under a
 * different name.
 */
import { describe, expect, it, jest } from '@jest/globals';

import { DuplicateCheckerService } from '../../duplicate-checker/duplicate-checker.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { ScrapedEvent, ScrapedVenue } from '../domain/scraper.interface';
import { EventStatusEnum } from '../domain/scraper-event.interfaces';
import { VenueTypeEnum } from '../domain/scraper-venue.interfaces';
import { EventZekaScraperService } from '../scrapers/eventzeka/eventzeka-scraper.service';
import { GoOutScraperService } from '../scrapers/go-out/go-out-scraper.service';
import { GuestListSerbiaScraperService } from '../scrapers/guest-list/guest-list-serbia-scraper.service';
import { InstagramScraperService } from '../scrapers/instagram/instagram-scraper.service';
import { ScraperLogs } from '../shared/scraper-logs';
import { ScraperService } from './scrape.service';

const NOW = new Date('2026-11-17T12:00:00Z');
const DB_VENUE_ID = '0b7e9c1d-2f4a-4c6b-8d1e-5a9f3c2b7e10';

const venue = (
  name: string,
  instagramHandle: string | null,
  point: [number, number],
): ScrapedVenue => ({
  hostId: 'host',
  venueType: VenueTypeEnum.EVENT_VENUE,
  name,
  description: null,
  latitude: point[0],
  longitude: point[1],
  address: 'Belgrade',
  createdAt: NOW,
  updatedAt: NOW,
  capacity: 100,
  pictureUrl: null,
  scraper: 'eventzeka',
  venueContacts: instagramHandle
    ? {
        phoneNumber: '',
        isViber: false,
        isPhone: false,
        isSms: false,
        isWhatsapp: false,
        instagramHandle,
        isInstagram: true,
        createdAt: NOW,
        updatedAt: NOW,
      }
    : null,
  requiresReservation: false,
  minAgeMale: 18,
  minAgeFemale: 18,
});

const event = (
  title: string,
  venueId: string,
  at: ScrapedVenue,
): ScrapedEvent => ({
  venue: at,
  venueId,
  title,
  description: '',
  startDateTime: new Date('2026-11-21T19:00:00Z'),
  endDateTime: new Date('2026-11-21T23:00:00Z'),
  tags: [],
  status: EventStatusEnum.ACTIVE,
  createdAt: NOW,
  updatedAt: NOW,
  pictureUrl: null,
  scraper: 'eventzeka',
});

describe('ScraperService with Event Zeka (scraper 4)', () => {
  it("saves an event at a venue the DB knows by its Instagram account under another name, and doesn't save that venue again", async () => {
    // Event Zeka's point for the theatre is 600 m from the one in the DB.
    const theatre = venue('Akademija 28', 'akademija28', [44.8035, 20.4635]);
    const newBar = venue('Bluz i Pivo', null, [44.8183, 20.4617]);

    const supabase = {
      getExistingVenuesWithContacts: jest.fn(async () => [
        {
          id: DB_VENUE_ID,
          name: 'Pozorište Akademija 28',
          address: 'Nemanjina 28, Beograd',
          latitude: 44.8089,
          longitude: 20.4621,
          minAgeMale: 18,
          minAgeFemale: 18,
          venueContacts: {
            id: 'contact-1',
            phoneNumber: null,
            instagramHandle: 'akademija28',
          },
        },
      ]),
      getExistingEvents: jest.fn(async () => []),
      saveScrapedData: jest.fn(
        async (data: { venues: ScrapedVenue[]; events: ScrapedEvent[] }) => ({
          venues: data.venues.length,
          events: data.events.length,
        }),
      ),
      deleteOldEvents: jest.fn(async () => 0),
    };
    const eventZeka = {
      scrape: jest.fn(async () => ({
        venues: [theatre, newBar],
        events: [
          event('Udaji se muški', 'k17akademija', theatre),
          event('Jelena Jovović & Shoomagnions', 'k17bluz', newBar),
        ],
      })),
    };

    const service = new ScraperService(
      {} as GoOutScraperService,
      {} as GuestListSerbiaScraperService,
      {} as InstagramScraperService,
      eventZeka as unknown as EventZekaScraperService,
      new DuplicateCheckerService({
        debug: () => undefined,
      } as unknown as ScraperLogs),
      supabase as unknown as SupabaseService,
    );

    await service.scrapeWithSingleScraper(4);

    const saved = supabase.saveScrapedData.mock.calls[0][0];
    expect(saved.venues.map((v) => v.name)).toEqual(['Bluz i Pivo']);
    expect(saved.events.map((e) => [e.title, e.venueId])).toEqual([
      ['Udaji se muški', DB_VENUE_ID],
      ['Jelena Jovović & Shoomagnions', 'k17bluz'],
    ]);
  });
});
