/**
 * DuplicateCheckerService drops scraped venues and events that the DB already
 * has. An event whose venue is in the DB under another name must still reach
 * that venue: the save step looks venues up by name, so the checker points
 * the event at the venue's id.
 */
import { describe, expect, it } from '@jest/globals';

import { ScrapedEvent, ScrapedVenue } from '../scrape/domain/scraper.interface';
import { EventStatusEnum } from '../scrape/domain/scraper-event.interfaces';
import { VenueTypeEnum } from '../scrape/domain/scraper-venue.interfaces';
import { ScraperLogs } from '../scrape/shared/scraper-logs';
import { DuplicateCheckerService } from './duplicate-checker.service';

const checker = () =>
  new DuplicateCheckerService({
    debug: () => undefined,
  } as unknown as ScraperLogs);

const NOW = new Date('2026-11-17T12:00:00Z');

const scrapedVenue = (overrides: Partial<ScrapedVenue> = {}): ScrapedVenue => ({
  hostId: 'host',
  venueType: VenueTypeEnum.CLUB,
  name: 'Drugstore',
  description: null,
  latitude: 44.8292,
  longitude: 20.4815,
  address: 'Belgrade',
  createdAt: NOW,
  updatedAt: NOW,
  capacity: 100,
  pictureUrl: null,
  scraper: 'eventzeka',
  venueContacts: null,
  requiresReservation: false,
  minAgeMale: 18,
  minAgeFemale: 18,
  ...overrides,
});

const scrapedEvent = (
  venue: ScrapedVenue,
  overrides: Partial<ScrapedEvent> = {},
): ScrapedEvent => ({
  venue,
  venueId: 'k17drugstore',
  title: 'Sunday Session',
  description: '',
  startDateTime: new Date('2026-11-22T22:00:00Z'),
  endDateTime: new Date('2026-11-23T03:00:00Z'),
  tags: [],
  status: EventStatusEnum.ACTIVE,
  createdAt: NOW,
  updatedAt: NOW,
  pictureUrl: null,
  scraper: 'eventzeka',
  ...overrides,
});

const DB_VENUE_ID = '6f1c3a52-7d3b-4d7e-9a43-2b1f0c9e8d11';

const existingVenue = {
  id: DB_VENUE_ID,
  name: 'DRUGSTORE',
  // The scraped venue's address is only the city.
  address: 'Bulevar despota Stefana 115, Beograd',
  // 30 m from the scraped point.
  latitude: 44.8294,
  longitude: 20.4818,
  min_age_male: 18,
  min_age_female: 18,
  contact: null,
};

describe('DuplicateCheckerService', () => {
  it('treats venues with the same name within 1 km as one, whatever the addresses say', () => {
    // 600 m north of the stored point.
    const venues = checker().filterDuplicateVenues(
      [scrapedVenue({ latitude: 44.8348 })],
      [existingVenue],
    );

    expect(venues).toEqual([]);
  });

  it('keeps namesakes farther apart, and a different name 30 m away, as new venues', () => {
    const farAway = scrapedVenue({ latitude: 44.7866, longitude: 20.4489 });
    const otherName = scrapedVenue({ name: 'Drugstore Gallery' });

    const venues = checker().filterDuplicateVenues(
      [farAway, otherName],
      [existingVenue],
    );

    expect(venues).toEqual([farAway, otherName]);
  });

  it('points an event at the DB venue its venue matched, by id', () => {
    const venue = scrapedVenue();

    const [kept] = checker().filterDuplicateEvents(
      [scrapedEvent(venue)],
      [],
      [existingVenue],
    );

    expect(kept.venueId).toBe(DB_VENUE_ID);
    expect(kept.venue).toBe(venue);
  });

  it("keeps the scraper's own venue key when the venue is new", () => {
    const venue = scrapedVenue({ latitude: 44.7866, longitude: 20.4489 });

    const [kept] = checker().filterDuplicateEvents(
      [scrapedEvent(venue)],
      [],
      [existingVenue],
    );

    expect(kept.venueId).toBe('k17drugstore');
  });

  it('still drops an event the matched DB venue already has', () => {
    const kept = checker().filterDuplicateEvents(
      [scrapedEvent(scrapedVenue())],
      [
        {
          id: 'event-1',
          venueId: DB_VENUE_ID,
          title: 'SUNDAY SESSION',
          description: null,
          startDateTime: new Date('2026-11-22T22:30:00Z'),
          endDateTime: new Date('2026-11-23T03:00:00Z'),
        },
      ],
      [existingVenue],
    );

    expect(kept).toEqual([]);
  });

  it("recognises a venue by the Instagram account in the DB venue's contact, under another name and 400 m away", () => {
    const venues = checker().filterDuplicateVenues(
      [
        scrapedVenue({
          name: 'Drugstore Beograd',
          latitude: 44.8327,
          longitude: 20.4815,
          venueContacts: {
            phoneNumber: '',
            isViber: false,
            isPhone: false,
            isSms: false,
            isWhatsapp: false,
            instagramHandle: 'drugstore_beograd',
            isInstagram: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        }),
      ],
      [
        {
          ...existingVenue,
          contact: {
            phoneNumber: null,
            instagramHandle: '@Drugstore_Beograd',
          },
        },
      ],
    );

    expect(venues).toEqual([]);
  });

  it("matches a DB venue by one of the scraped venue's other names", () => {
    const venues = checker().filterDuplicateVenues(
      [
        scrapedVenue({
          name: 'Drugstore Belgrade',
          aliases: ['Klub Drugstore', 'Drugstore'],
          // 600 m from the stored point.
          latitude: 44.8348,
        }),
      ],
      [existingVenue],
    );

    expect(venues).toEqual([]);
  });

  it('treats names that differ only in words like "club" or "Belgrade" as one venue within 300 m', () => {
    // About 180 m and 510 m from the stored point.
    const near = scrapedVenue({
      name: 'Klub Drugstore Beograd',
      latitude: 44.831,
    });
    const far = scrapedVenue({ name: 'Drugstore Club', latitude: 44.834 });

    const venues = checker().filterDuplicateVenues(
      [near, far],
      [existingVenue],
    );

    expect(venues).toEqual([far]);
  });

  it('does not match names made only of words like "club" and "bar"', () => {
    const venue = scrapedVenue({ name: 'Club Bar' });

    const venues = checker().filterDuplicateVenues(
      [venue],
      [{ ...existingVenue, name: 'Bar Club' }],
    );

    expect(venues).toEqual([venue]);
  });
});
