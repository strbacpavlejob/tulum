import { Injectable, Logger } from '@nestjs/common';

import {
  SCRAPER_CONFIGS,
  ScraperConfig,
  ScraperSource,
} from '../../domain/scraper-config';
import {
  ExistingData,
  ScrapedEvent,
  ScrapedVenue,
  Scraper,
  ScraperResult,
} from '../../domain/scraper.interface';
import { Venue } from '../../domain/scraper-venue.interfaces';
import { sanitizeScrapedText } from '../../shared/scraper.helpers';
import { AiEventProcessingService } from '../../application/ai-event-processing/ai-event-processing.service';
import {
  InstagramApifyService,
  InstagramPost,
} from './instagram-apify.service';

interface InstagramCandidateEvent {
  ownerUsername: string;
  sourceUrl: string;
  timestamp: string;
  venueId: string;
  venue: ScrapedVenue;
  imageUrl: string | null;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags: string[];
  [key: string]: unknown;
}

@Injectable()
export class InstagramScraperService implements Scraper<
  [existingVenue: Venue],
  [instagramEvent: InstagramCandidateEvent]
> {
  public readonly config: ScraperConfig = {
    ...SCRAPER_CONFIGS[ScraperSource.INSTAGRAM],
    baseUrl: 'https://apify.com/apify/instagram-scraper',
  };

  private readonly logger = new Logger(InstagramScraperService.name);

  constructor(
    private readonly instagramApifyService: InstagramApifyService,
    private readonly aiEventProcessingService: AiEventProcessingService,
  ) {}

  mapVenue(existingVenue: Venue): ScrapedVenue {
    return {
      hostId: existingVenue.hostId,
      venueType: existingVenue.venueType,
      name: existingVenue.name,
      description: existingVenue.description,
      latitude: existingVenue.latitude,
      longitude: existingVenue.longitude,
      address: existingVenue.address,
      createdAt: existingVenue.createdAt,
      updatedAt: existingVenue.updatedAt,
      capacity: existingVenue.capacity,
      pictureUrl: existingVenue.pictureUrl,
      scraper: existingVenue.scraper,
      venueContacts: existingVenue.venueContacts,
      requiresReservation: existingVenue.requiresReservation,
      minAgeMale: existingVenue.minAgeMale,
      minAgeFemale: existingVenue.minAgeFemale,
    };
  }

  mapEvent(instagramEvent: InstagramCandidateEvent): ScrapedEvent {
    const now = new Date();

    return {
      venue: instagramEvent.venue,
      venueId: instagramEvent.venueId,
      title: instagramEvent.title,
      description: sanitizeScrapedText(instagramEvent.description),
      startDateTime: new Date(instagramEvent.startDateTime),
      endDateTime: new Date(instagramEvent.endDateTime),
      tags: instagramEvent.tags.slice(0, 3),
      status: this.config.events.defaultStatus,
      createdAt: now,
      updatedAt: now,
      pictureUrl: instagramEvent.imageUrl,
      scraper: this.config.source,
    };
  }

  async scrape(existingData?: ExistingData): Promise<ScraperResult> {
    const venues = existingData?.venues ?? [];
    if (!venues.length) {
      this.logger.log(
        'No venues available in existing data for Instagram scrape.',
      );
      return { venues: [], events: [] };
    }

    const handleToVenue = new Map<string, Venue>();
    for (const venue of venues) {
      if (venue.scraper === ScraperSource.INSTAGRAM) {
        continue;
      }

      const normalizedHandle = this.normalizeHandle(
        venue.venueContacts?.instagramHandle,
      );
      if (!normalizedHandle) {
        continue;
      }

      if (!handleToVenue.has(normalizedHandle)) {
        handleToVenue.set(normalizedHandle, venue);
      }
    }

    const handles = [...handleToVenue.keys()];
    if (!handles.length) {
      this.logger.log(
        'No eligible Instagram handles found on existing venues.',
      );
      return { venues: [], events: [] };
    }

    this.logger.log(`Preparing Apify scrape for ${handles.length} handles.`);

    let posts: InstagramPost[] = [];
    try {
      posts = await this.instagramApifyService.fetchPosts(handles);
    } catch (err) {
      this.logger.error(
        `Failed to fetch Instagram posts from Apify: ${(err as Error).message}`,
      );
      return { venues: [], events: [] };
    }

    if (!posts.length) {
      this.logger.log('Apify returned no Instagram posts.');
      return { venues: [], events: [] };
    }

    const fallbackDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const candidateEvents: InstagramCandidateEvent[] = [];
    for (const post of posts) {
      const ownerHandle = this.normalizeHandle(post.ownerUsername);
      if (!ownerHandle) {
        this.logger.warn('Skipping post with missing ownerUsername.');
        continue;
      }

      const sourceVenue = handleToVenue.get(ownerHandle);
      if (!sourceVenue) {
        this.logger.warn(
          `Skipping post for unknown ownerUsername @${ownerHandle}.`,
        );
        continue;
      }

      const description = (post.caption ?? '').trim();
      if (!description) {
        continue;
      }

      const startDate = this.parseDateOrFallback(post.timestamp, fallbackDate);
      const endDate = new Date(startDate);
      endDate.setHours(
        endDate.getHours() + this.config.events.defaultDurationHour,
      );

      const sourceUrl =
        post.url ?? `https://www.instagram.com/p/${post.shortCode ?? ''}`;

      candidateEvents.push({
        ownerUsername: ownerHandle,
        sourceUrl,
        imageUrl: post.displayUrl ?? null,
        timestamp: startDate.toISOString(),
        venueId: sourceVenue.id,
        venue: this.mapVenue(sourceVenue),
        title: description.substring(0, 80),
        description,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        tags: [],
      });
    }

    if (!candidateEvents.length) {
      this.logger.log('No Instagram posts could be mapped to existing venues.');
      return { venues: [], events: [] };
    }

    const processedEvents = await this.processEventsSafely(candidateEvents);
    const scrapedEvents = processedEvents.map((event) => this.mapEvent(event));

    this.logger.log(
      `Instagram bulk scrape produced ${scrapedEvents.length} events.`,
    );

    return { venues: [], events: scrapedEvents };
  }

  private normalizeHandle(handle?: string | null): string | null {
    if (!handle) {
      return null;
    }

    const normalized = handle.trim().replace(/^@+/, '').toLowerCase();
    if (!normalized || !/^[a-z0-9._]+$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private parseDateOrFallback(
    timestamp: string | undefined,
    fallback: Date,
  ): Date {
    if (!timestamp) {
      return fallback;
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }

    return parsed;
  }

  private async processEventsSafely(
    candidateEvents: InstagramCandidateEvent[],
  ): Promise<InstagramCandidateEvent[]> {
    try {
      return await this.aiEventProcessingService.processEvents(candidateEvents);
    } catch (err) {
      this.logger.error(
        `AI event processing failed, returning unprocessed candidate events: ${(err as Error).message}`,
      );

      return candidateEvents.map((event) => ({
        ...event,
        tags: event.tags.length ? event.tags : ['instagram'],
        description: sanitizeScrapedText(event.description) ?? '',
      }));
    }
  }
}
