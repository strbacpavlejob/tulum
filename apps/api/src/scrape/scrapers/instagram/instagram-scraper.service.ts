import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
import { VenueTypeEnum } from '../../domain/scraper-venue.interfaces';
import { VenueContact } from '../../domain/scraper-venue-contact.interfaces';
import { sanitizeScrapedText } from '../../shared/scraper.helpers';
import { instagramUsernameList } from 'src/scrape/instagram-username-list';
import { InstagramVenueScraperService } from 'src/instagram/instagram-venue-scraper.service';
import { extractEventData } from 'src/instagram/instagram-event-extractor';
import { GeocoderService } from 'src/geocoder/geocoder.service';
import { R2Service } from 'src/r2/r2.service';

export interface InstagramVenue {
  username: string;
  fullName: string | null;
  biography: string | null;
  phoneNumber: string | null;
  isWhatsappLinked: boolean;
  profilePictureUrl: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface InstagramEvent {
  username: string;
  venueName: string;
  imageUrl: string | null;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  tags: string[];
}

@Injectable()
export class InstagramScraperService implements Scraper<
  [instagramVenue: InstagramVenue],
  [instagramEvent: InstagramEvent, venueId: string, venue: ScrapedVenue]
> {
  public readonly config: ScraperConfig =
    SCRAPER_CONFIGS[ScraperSource.INSTAGRAM];

  private readonly logger = new Logger(InstagramScraperService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly instagramVenueScraperService: InstagramVenueScraperService,
    private readonly geocoderService: GeocoderService,
    private readonly r2Service: R2Service,
  ) {
    const baseConfig = SCRAPER_CONFIGS[ScraperSource.INSTAGRAM];

    this.config = {
      ...baseConfig,
      venues: {
        ...baseConfig.venues,
        defaultHostId: this.configService.getOrThrow<string>(
          'DEFAULT_VENUE_HOST_ID',
        ),
      },
    };
  }

  mapVenue(instagramVenue: InstagramVenue): ScrapedVenue {
    const now = new Date();

    const contact: VenueContact | null = instagramVenue.username
      ? {
          phoneNumber: instagramVenue.phoneNumber ?? '',
          isPhone: !!instagramVenue.phoneNumber,
          isViber: false,
          isSms: false,
          isWhatsapp: instagramVenue.isWhatsappLinked,
          instagramHandle: instagramVenue.username,
          isInstagram: true,
          createdAt: now,
          updatedAt: now,
        }
      : null;

    return {
      hostId: this.config.venues.defaultHostId ?? 'DEFAULT_VENUE_HOST_ID',
      venueType: VenueTypeEnum.NIGHTCLUB,
      name:
        instagramVenue.fullName ??
        instagramVenue.username ??
        contact?.instagramHandle ??
        'Unknown Venue',
      longitude: instagramVenue.longitude,
      latitude: instagramVenue.latitude,
      address:
        instagramVenue.address ??
        instagramVenue.fullName ??
        instagramVenue.username,
      description: sanitizeScrapedText(instagramVenue.biography ?? null),
      capacity: this.config.venues.defaultCapacity,
      pictureUrl: instagramVenue.profilePictureUrl,
      scraper: this.config.source,
      venueContacts: contact,
      requiresReservation: false,
      minAgeMale: this.config.venues.defaultAgeRestriction?.male ?? 0,
      minAgeFemale: this.config.venues.defaultAgeRestriction?.female ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  mapEvent(
    instagramEvent: InstagramEvent,
    venueId: string,
    venue: ScrapedVenue,
  ): ScrapedEvent {
    const now = new Date();

    return {
      venue,
      venueId,
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

  async scrape(existingData: ExistingData): Promise<ScraperResult> {
    const scrapedVenues: ScrapedVenue[] = [];
    const scrapedEvents: ScrapedEvent[] = [];

    const existingInstagramHandles = new Set(
      existingData.venues
        ?.map((venue) => venue.venueContacts?.instagramHandle)
        .filter(Boolean),
    );

    const filteredUsernameList = instagramUsernameList.filter(
      (username) => !existingInstagramHandles.has(username),
    );
    for (const username of filteredUsernameList) {
      try {
        this.logger.log(`Scraping @${username}...`);

        const { profile, posts } =
          await this.instagramVenueScraperService.scrapeVenue(username);

        const rawAddress = profile.address ?? profile.fullName ?? username;
        const { latitude, longitude } =
          await this.geocoderService.geocode(rawAddress);

        const profilePictureUrl = await this.uploadProfilePicture(
          username,
          profile.profilePictureUrl,
        );

        const instagramVenue: InstagramVenue = {
          username,
          fullName: profile.fullName,
          biography: profile.biography,
          phoneNumber: profile.phoneNumber,
          isWhatsappLinked: profile.isWhatsappLinked,
          profilePictureUrl,
          address: rawAddress,
          latitude,
          longitude,
        };

        const venue = this.mapVenue(instagramVenue);
        const venueId = `instagram|${username}`;
        scrapedVenues.push(venue);

        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          if (!post.description) continue;

          const extracted = extractEventData(post.description);
          const fallbackDate = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();

          const imageUrl = await this.uploadPostImage(
            username,
            i,
            post.imageUrl,
          );

          const instagramEvent: InstagramEvent = {
            username,
            venueName: profile.fullName ?? username,
            imageUrl,
            title: extracted.title ?? post.description.substring(0, 80),
            description: post.description,
            startDateTime: extracted.startDateTime ?? fallbackDate,
            endDateTime:
              extracted.endDateTime ?? extracted.startDateTime ?? fallbackDate,
            tags: extracted.tags,
          };

          scrapedEvents.push(this.mapEvent(instagramEvent, venueId, venue));
        }

        this.logger.log(
          `@${username}: scraped venue + ${scrapedEvents.length} events`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to scrape @${username}: ${(err as Error).message}`,
        );
      }
    }

    return { venues: scrapedVenues, events: scrapedEvents };
  }

  private async uploadProfilePicture(
    username: string,
    url: string | null,
  ): Promise<string | null> {
    if (!url) return null;
    try {
      return await this.r2Service.downloadAndUpload(
        url,
        `scraped/instagram/${username}/profile.webp`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to upload profile picture for @${username}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async uploadPostImage(
    username: string,
    index: number,
    url: string | null,
  ): Promise<string | null> {
    if (!url) return null;
    try {
      return await this.r2Service.downloadAndUpload(
        url,
        `scraped/instagram/${username}/posts/${Date.now()}-${index}.webp`,
        { width: 500, height: 375, maxSize: 5 * 1024 * 1024 },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to upload post image for @${username}[${index}]: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
