import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ScraperSource } from '../../domain/scraper-config';
import { firstValueFrom } from 'rxjs';
import { GoEvent } from '../../interfaces/go-event.interface';
import {
  Event as DomainEvent,
  EventStatusEnum,
} from '../../domain/scraper-event.interfaces';
import {
  Venue as DomainVenue,
  VenueTypeEnum,
} from '../../domain/scraper-venue.interfaces';
import { Scraper } from '../../domain/scraper.interface';
import { SCRAPER_CONFIGS, ScraperConfig } from '../../domain/scraper-config';
import { VenueType } from 'src/scrape/interfaces';

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
  venueType: VenueTypeEnum | VenueType,
): Omit<DomainVenue, 'id'> {
  return {
    hostId:
      (process.env.DEFAULT_VENUE_HOST_ID as string) ||
      goEvent.host_id?.toString() ||
      'user_test',
    venueType: venueType as unknown as VenueTypeEnum,
    name: goEvent.host,
    longitude: goEvent.longitude,
    latitude: goEvent.latitude,
    address: goEvent.location_name,
    description: stripHtml(goEvent.description),
    capacity: DEFAULT_VENUE_CAPACITY,
    pictureUrl: goEvent.image_url || goEvent.thumb_url || null,
    scraper: 'goout',
    contactId: null,
    requiresReservation: false,
    minAgeMale: 0,
    minAgeFemale: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function mapGoEventToEvent(
  goEvent: GoEvent,
  venueId: number | string,
): Omit<DomainEvent, 'id'> & { id?: string } {
  const startDate = new Date(goEvent.start_timestamp);
  const endDate = new Date(
    startDate.getTime() + DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000,
  );

  return {
    venueId: venueId.toString(),
    title: goEvent.name,
    description: stripHtml(goEvent.description),
    startDateTime: startDate,
    endDateTime: endDate,
    tags: (goEvent.tags?.map((tag) => tag.name) ?? []).slice(0, 3),
    status: EventStatusEnum.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    pictureUrl: goEvent.image_url || goEvent.thumb_url || null,
    scraper: 'goout',
  };
}

@Injectable()
export class GoOutScraperService implements Scraper {
  private readonly logger = new Logger(GoOutScraperService.name);

  // Expose config to satisfy the `Scraper` interface
  public readonly config: ScraperConfig = SCRAPER_CONFIGS[ScraperSource.GOOUT];

  constructor(private readonly httpService: HttpService) {}

  async scrape(): Promise<{
    venues: Omit<DomainVenue, 'id'>[];
    events: (Omit<DomainEvent, 'id'> & { id?: string })[];
  }> {
    const accessToken = await this.authenticate();

    const categoryToVenue = this.buildCategoryToVenueTypeMap();
    const allGoEvents: { event: GoEvent; venueType: VenueTypeEnum }[] = [];

    for (const [categoryId, venueType] of Object.entries(categoryToVenue)) {
      const cid = Number(categoryId);
      this.logger.log(`Scraping category ${cid} (${venueType})...`);
      const events = await this.fetchAllEvents(accessToken, cid);
      this.logger.log(`Category ${venueType}: fetched ${events.length} events`);
      events.forEach((e) => allGoEvents.push({ event: e, venueType }));
    }

    this.logger.log(
      `Total events fetched across all categories: ${allGoEvents.length}`,
    );
    return this.transformEvents(allGoEvents);
  }

  private async authenticate(): Promise<string> {
    this.logger.log('Authenticating with GoOut...');

    const token = await this.fetchWithRetry<string>(async () => {
      const response = await firstValueFrom(
        this.httpService.post<{ access_token: string }>(
          `${this.config.baseUrl}/auth/register`,
          { auth: 'client' },
          { timeout: 30_000 },
        ),
      );
      return response.data.access_token;
    });

    this.logger.log('Authentication successful');
    return token;
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 2000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        const isRetryable = !status || status >= 500;
        if (!isRetryable || attempt === retries) throw err;
        const wait = delayMs * 2 ** (attempt - 1);
        this.logger.warn(
          `Request failed (attempt ${attempt}/${retries}, status ${status ?? 'no response'}). Retrying in ${wait}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
    throw new Error('Unreachable');
  }

  private async fetchAllEvents(
    accessToken: string,
    categoryId: number,
  ): Promise<GoEvent[]> {
    const allEvents: GoEvent[] = [];
    let lastEventId: number | undefined;

    while (true) {
      const params: Record<string, number> = { categoryIds: categoryId };
      if (lastEventId !== undefined) params.lastEventId = lastEventId;

      this.logger.log(
        `Fetching events for category=${categoryId}` +
          (lastEventId !== undefined ? ` lastEventId=${lastEventId}` : ''),
      );

      const events = await this.fetchWithRetry(async () => {
        const res = await firstValueFrom(
          this.httpService.get<GoEvent[]>(
            `${this.config.baseUrl}/events/tailored`,
            {
              params,
              headers: { Authorization: `Bearer ${accessToken}` },
              timeout: 30_000,
            },
          ),
        );
        return res.data;
      });

      if (!events || events.length === 0) {
        this.logger.log(
          `No more events for category ${categoryId}. Pagination complete.`,
        );
        break;
      }

      this.logger.log(`Fetched ${events.length} events`);
      allEvents.push(...events);
      lastEventId = events[events.length - 1].id;
    }

    return allEvents;
  }

  private buildCategoryToVenueTypeMap(): Record<number, VenueTypeEnum> {
    return this.config.venues.venueTypeMapping.reduce(
      (acc, m) => {
        acc[Number(m.queryValue)] = m.venueType as VenueTypeEnum;
        return acc;
      },
      {} as Record<number, VenueTypeEnum>,
    );
  }

  private transformEvents(
    goEvents: { event: GoEvent; venueType: VenueTypeEnum }[],
  ): {
    venues: Omit<DomainVenue, 'id'>[];
    events: (Omit<DomainEvent, 'id'> & { id?: string })[];
  } {
    const venueMap = new Map<number, Omit<DomainVenue, 'id'>>();
    const events: (Omit<DomainEvent, 'id'> & { id?: string })[] = [];

    for (const { event: goEvent, venueType } of goEvents) {
      if (!venueMap.has(goEvent.host_id)) {
        venueMap.set(goEvent.host_id, mapGoEventToVenue(goEvent, venueType));
      }

      const event = mapGoEventToEvent(goEvent, goEvent.host_id);
      events.push(event);
    }

    const venues = Array.from(venueMap.values());
    const venueTypeCounts = venues.reduce(
      (acc, v) => {
        const key = String(v.venueType);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    this.logger.log(
      `Mapped ${venues.length} unique venues and ${events.length} events`,
    );
    this.logger.log(`Venue type breakdown: ${JSON.stringify(venueTypeCounts)}`);

    return { venues, events };
  }
}
