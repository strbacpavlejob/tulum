import { describe, expect, it, jest } from '@jest/globals';
import { AiEventProcessingService } from '../../application/ai-event-processing/ai-event-processing.service';
import { ScraperSource } from '../../domain/scraper-config';
import { ExistingData } from '../../domain/scraper.interface';
import { VenueTypeEnum } from '../../domain/scraper-venue.interfaces';
import {
  InstagramApifyService,
  InstagramPost,
} from './instagram-apify.service';
import { InstagramScraperService } from './instagram-scraper.service';

describe('InstagramScraperService', () => {
  const makeVenue = (
    id: string,
    handle: string | null,
    scraper: string | null = ScraperSource.GOOUT,
  ) => ({
    id,
    hostId: 'host-1',
    venueType: VenueTypeEnum.NIGHTCLUB,
    name: `Venue ${id}`,
    description: 'desc',
    latitude: 44.8,
    longitude: 20.4,
    address: 'Address',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    capacity: 100,
    pictureUrl: null,
    scraper,
    venueContacts: handle
      ? {
          phoneNumber: '',
          isViber: false,
          isPhone: false,
          isSms: false,
          isWhatsapp: false,
          instagramHandle: handle,
          isInstagram: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        }
      : null,
    requiresReservation: false,
    minAgeMale: 18,
    minAgeFemale: 18,
  });

  const makePost = (ownerUsername: string, caption: string): InstagramPost => ({
    id: `post-${ownerUsername}`,
    type: 'Image',
    url: `https://www.instagram.com/p/${ownerUsername}`,
    displayUrl: `https://img/${ownerUsername}.jpg`,
    timestamp: '2026-09-10T20:00:00.000Z',
    ownerUsername,
    shortCode: ownerUsername,
    caption,
  });

  const setup = () => {
    const instagramApifyService = {
      fetchPosts: jest.fn<Promise<InstagramPost[]>, [string[]]>(),
    } as unknown as InstagramApifyService;

    const aiEventProcessingService = {
      processEvents: jest.fn(),
    } as unknown as AiEventProcessingService;

    const service = new InstagramScraperService(
      instagramApifyService,
      aiEventProcessingService,
    );

    return {
      service,
      instagramApifyService,
      aiEventProcessingService,
    };
  };

  it('returns empty result when there are no existing venues', async () => {
    const { service, instagramApifyService } = setup();

    const result = await service.scrape({ venues: [] });

    expect(result).toEqual({ venues: [], events: [] });
    expect(instagramApifyService.fetchPosts).not.toHaveBeenCalled();
  });

  it('ignores venues without valid instagram handles', async () => {
    const { service, instagramApifyService } = setup();

    const existingData: ExistingData = {
      venues: [makeVenue('1', null), makeVenue('2', '   ')],
    };

    const result = await service.scrape(existingData);

    expect(result).toEqual({ venues: [], events: [] });
    expect(instagramApifyService.fetchPosts).not.toHaveBeenCalled();
  });

  it('ignores venues originally scraped from instagram', async () => {
    const { service, instagramApifyService } = setup();

    const existingData: ExistingData = {
      venues: [makeVenue('1', 'club_a', ScraperSource.INSTAGRAM)],
    };

    const result = await service.scrape(existingData);

    expect(result).toEqual({ venues: [], events: [] });
    expect(instagramApifyService.fetchPosts).not.toHaveBeenCalled();
  });

  it('normalizes handles and deduplicates before one bulk Apify call', async () => {
    const { service, instagramApifyService, aiEventProcessingService } =
      setup();

    instagramApifyService.fetchPosts = jest
      .fn<Promise<InstagramPost[]>, [string[]]>()
      .mockResolvedValue([]);
    aiEventProcessingService.processEvents = jest.fn().mockResolvedValue([]);

    const existingData: ExistingData = {
      venues: [
        makeVenue('1', '@DrugstoreBeograd'),
        makeVenue('2', ' drugstorebeograd '),
        makeVenue('3', 'DRUGSTOREBEOGRAD'),
      ],
    };

    await service.scrape(existingData);

    expect(instagramApifyService.fetchPosts).toHaveBeenCalledTimes(1);
    expect(instagramApifyService.fetchPosts).toHaveBeenCalledWith([
      'drugstorebeograd',
    ]);
  });

  it('maps Apify posts to venues using ownerUsername and skips unknown owners', async () => {
    const { service, instagramApifyService, aiEventProcessingService } =
      setup();

    instagramApifyService.fetchPosts = jest
      .fn<Promise<InstagramPost[]>, [string[]]>()
      .mockResolvedValue([
        makePost('knownvenue', 'Tonight live DJ set'),
        makePost('unknownvenue', 'Should be ignored'),
      ]);

    aiEventProcessingService.processEvents = jest
      .fn()
      .mockImplementation(async (events) => events);

    const existingData: ExistingData = {
      venues: [makeVenue('venue-1', '@KnownVenue')],
    };

    const result = await service.scrape(existingData);

    expect(result.venues).toEqual([]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].venueId).toBe('venue-1');
    expect(result.events[0].title).toContain('Tonight live DJ set');
  });

  it('passes candidate events to AI and keeps only AI-approved events', async () => {
    const { service, instagramApifyService, aiEventProcessingService } =
      setup();

    instagramApifyService.fetchPosts = jest
      .fn<Promise<InstagramPost[]>, [string[]]>()
      .mockResolvedValue([
        makePost('clubx', 'Big party Friday night'),
        makePost('clubx', 'Regular promo post'),
      ]);

    aiEventProcessingService.processEvents = jest
      .fn()
      .mockImplementation(async (events) => [events[0]]);

    const existingData: ExistingData = {
      venues: [makeVenue('venue-1', 'clubx')],
    };

    const result = await service.scrape(existingData);

    expect(aiEventProcessingService.processEvents).toHaveBeenCalledTimes(1);
    expect(result.events).toHaveLength(1);
  });

  it('returns empty events when Apify returns no posts', async () => {
    const { service, instagramApifyService, aiEventProcessingService } =
      setup();

    instagramApifyService.fetchPosts = jest
      .fn<Promise<InstagramPost[]>, [string[]]>()
      .mockResolvedValue([]);
    aiEventProcessingService.processEvents = jest.fn().mockResolvedValue([]);

    const result = await service.scrape({
      venues: [makeVenue('venue-1', 'clubx')],
    });

    expect(result).toEqual({ venues: [], events: [] });
  });

  it('falls back to unprocessed candidate events when AI processing fails', async () => {
    const { service, instagramApifyService, aiEventProcessingService } =
      setup();

    instagramApifyService.fetchPosts = jest
      .fn<Promise<InstagramPost[]>, [string[]]>()
      .mockResolvedValue([makePost('clubx', 'Party from 22h')]);

    aiEventProcessingService.processEvents = jest
      .fn()
      .mockRejectedValue(new Error('AI unavailable'));

    const result = await service.scrape({
      venues: [makeVenue('venue-1', 'clubx')],
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].venueId).toBe('venue-1');
    expect(result.events[0].description).toContain('Party from 22h');
  });
});
