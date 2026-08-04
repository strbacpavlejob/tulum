import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import {
  SCRAPER_CONFIGS,
  ScraperConfig,
  ScraperSource,
} from '../../domain/scraper-config';
import {
  ScrapedEvent,
  ScrapedVenue,
  Scraper,
  ScraperResult,
} from '../../domain/scraper.interface';
import { VenueTypeEnum } from '../../domain/scraper-venue.interfaces';
import { GoEvent } from '../../interfaces/go-event.interface';
import {
  buildVenueTypeMap,
  createEventDateRange,
  getHttpStatus,
  isRetryableHttpError,
  sanitizeScrapedText,
  withRetry,
} from '../../shared/scraper.helpers';
import { ScraperLogs } from '../../shared/scraper-logs';

interface GoOutEventWithVenueType {
  event: GoEvent;
  venueType: VenueTypeEnum;
}

@Injectable()
export class GoOutScraperService implements Scraper<
  [goEvent: GoEvent, venueType: VenueTypeEnum],
  [goEvent: GoEvent, venueId: number | string]
> {
  public readonly config: ScraperConfig = SCRAPER_CONFIGS[ScraperSource.GOOUT];

  private readonly logs = new ScraperLogs(
    GoOutScraperService.name,
    this.config.source,
  );

  constructor(private readonly httpService: HttpService) {}

  mapVenue(goEvent: GoEvent, venueType: VenueTypeEnum): ScrapedVenue {
    const now = new Date();

    return {
      hostId: this.config.venues.defaultHostId,
      venueType,
      name: goEvent.host,
      longitude: goEvent.longitude,
      latitude: goEvent.latitude,
      address: goEvent.location_name,
      description: sanitizeScrapedText(goEvent.description),
      capacity: this.config.venues.defaultCapacity,
      pictureUrl: goEvent.image_url || goEvent.thumb_url || null,
      scraper: this.config.source,
      contact: null,
      requiresReservation: false,
      minAgeMale: this.config.venues.defaultAgeRestriction?.male ?? 0,
      minAgeFemale: this.config.venues.defaultAgeRestriction?.female ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  mapEvent(goEvent: GoEvent, venueId: number | string): ScrapedEvent {
    const { startDate, endDate } = createEventDateRange(
      goEvent.start_timestamp,
      this.config.events.defaultDurationHour,
    );

    const now = new Date();

    return {
      venueId: String(venueId),
      title: goEvent.name,
      description: sanitizeScrapedText(goEvent.description),
      startDateTime: startDate,
      endDateTime: endDate,
      tags: goEvent.tags?.slice(0, 3).map((tag) => tag.name) ?? [],
      status: this.config.events.defaultStatus,
      createdAt: now,
      updatedAt: now,
      pictureUrl: goEvent.image_url || goEvent.thumb_url || null,
      scraper: this.config.source,
    };
  }

  async scrape(): Promise<ScraperResult> {
    const accessToken = await this.authenticate();

    const categoryToVenueType = this.buildCategoryToVenueTypeMap();

    const allGoEvents: GoOutEventWithVenueType[] = [];

    for (const [categoryId, venueType] of categoryToVenueType) {
      const numericCategoryId = Number(categoryId);

      this.logs.categoryScrapingStarted(numericCategoryId, venueType);

      const events = await this.fetchAllEvents(accessToken, numericCategoryId);

      this.logs.categoryScrapingCompleted(
        numericCategoryId,
        venueType,
        events.length,
      );

      allGoEvents.push(
        ...events.map((event) => ({
          event,
          venueType,
        })),
      );
    }

    this.logs.allCategoriesFetched(allGoEvents.length);

    return this.transformEvents(allGoEvents);
  }

  private async authenticate(): Promise<string> {
    this.logs.authenticationStarted();

    const accessToken = await this.executeWithRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
        }>(
          `${this.config.baseUrl}/auth/register`,
          {
            auth: 'client',
          },
          {
            timeout: this.config.tokenFetchDelay,
          },
        ),
      );

      return response.data.access_token;
    }, this.config.tokenFetchDelay);

    this.logs.authenticationSuccessful();

    return accessToken;
  }

  private async fetchAllEvents(
    accessToken: string,
    categoryId: number,
  ): Promise<GoEvent[]> {
    const allEvents: GoEvent[] = [];
    let lastEventId: number | undefined;

    const categoryName = this.getCategoryName(categoryId);

    while (true) {
      const params: Record<string, number> = {
        categoryIds: categoryId,
      };

      if (lastEventId !== undefined) {
        params.lastEventId = lastEventId;
      }

      this.logs.paginationRequest(categoryId, categoryName, lastEventId);

      const events = await this.executeWithRetry(async () => {
        const response = await firstValueFrom(
          this.httpService.get<GoEvent[]>(
            `${this.config.baseUrl}/events/tailored`,
            {
              params,
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              timeout: this.config.events.fetchDelay,
            },
          ),
        );

        return response.data;
      }, this.config.events.fetchDelay);

      if (!events?.length) {
        this.logs.paginationCompleted(categoryId, allEvents.length);

        break;
      }

      this.logs.paginationPageFetched(categoryId, events.length);

      allEvents.push(...events);

      const currentLastEventId = events.at(-1)?.id;

      if (currentLastEventId === undefined) {
        this.logs.paginationCompleted(categoryId, allEvents.length);

        break;
      }

      if (currentLastEventId === lastEventId) {
        this.logs.paginationStopped(categoryId, currentLastEventId);

        break;
      }

      lastEventId = currentLastEventId;
    }

    return allEvents;
  }

  private executeWithRetry<T>(
    operation: () => Promise<T>,
    delayMs = 0,
  ): Promise<T> {
    return withRetry(operation, {
      retries: 3,
      delayMs,
      shouldRetry: isRetryableHttpError,
      onRetry: ({ error, attempt, retries, waitMs }) => {
        this.logs.requestRetry({
          attempt,
          retries,
          waitMs,
          status: getHttpStatus(error),
        });
      },
    });
  }

  private buildCategoryToVenueTypeMap(): Map<string, VenueTypeEnum> {
    return buildVenueTypeMap(this.config.venues.venueTypeMapping);
  }

  private getCategoryName(categoryId: number): string | undefined {
    const mapping = this.config.venues.venueTypeMapping.find(
      ({ queryValue }) => Number(queryValue) === categoryId,
    );

    if (!mapping) {
      return undefined;
    }

    return String(mapping.venueType);
  }

  private transformEvents(goEvents: GoOutEventWithVenueType[]): ScraperResult {
    const venueMap = new Map<number, ScrapedVenue>();

    const events: ScrapedEvent[] = [];

    for (const { event: goEvent, venueType } of goEvents) {
      if (!venueMap.has(goEvent.host_id)) {
        venueMap.set(goEvent.host_id, this.mapVenue(goEvent, venueType));
      }

      events.push(this.mapEvent(goEvent, goEvent.host_id));
    }

    const venues = Array.from(venueMap.values());

    this.logs.transformationCompleted(venues, events);

    return {
      venues,
      events,
    };
  }
}
