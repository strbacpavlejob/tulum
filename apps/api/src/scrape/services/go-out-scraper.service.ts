import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GoEvent } from '../interfaces/go-event.interface';
import { Event } from '../interfaces/event.interface';
import { Venue, VenueType } from '../interfaces/venue.interface';
import {
  mapGoEventToEvent,
  mapGoEventToVenue,
} from '../mappers/go-event.mapper';

const GOOUT_BASE_URL = 'https://appserver.goout.rs/api/v1';

type GoOutCategoryId = 7058 | 7059 | 7060 | 7061 | 7062;

const GOOUT_CATEGORY_TO_VENUE_TYPE: Record<GoOutCategoryId, VenueType> = {
  7058: 'restaurant',
  7059: 'bar',
  7060: 'nightclub',
  7061: 'raft',
  7062: 'tavern',
};

const GOOUT_CATEGORIES = Object.keys(GOOUT_CATEGORY_TO_VENUE_TYPE).map(
  Number,
) as GoOutCategoryId[];

@Injectable()
export class GoOutScraperService {
  private readonly logger = new Logger(GoOutScraperService.name);

  constructor(private readonly httpService: HttpService) {}

  async scrape(): Promise<{
    venues: Omit<Venue, 'id'>[];
    events: (Omit<Event, 'id'> & { id?: string })[];
  }> {
    const accessToken = await this.authenticate();

    const allGoEvents: { event: GoEvent; venueType: VenueType }[] = [];

    for (const categoryId of GOOUT_CATEGORIES) {
      const venueType = GOOUT_CATEGORY_TO_VENUE_TYPE[categoryId];
      this.logger.log(`Scraping category ${categoryId} (${venueType})...`);

      const events = await this.fetchAllEvents(accessToken, categoryId);
      this.logger.log(`Category ${venueType}: fetched ${events.length} events`);

      for (const event of events) {
        allGoEvents.push({ event, venueType });
      }
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
          `${GOOUT_BASE_URL}/auth/register`,
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
    categoryId: GoOutCategoryId,
  ): Promise<GoEvent[]> {
    const allEvents: GoEvent[] = [];
    let lastEventId: number | undefined;

    while (true) {
      const params: Record<string, number> = { categoryIds: categoryId };
      if (lastEventId !== undefined) {
        params.lastEventId = lastEventId;
      }

      this.logger.log(
        `Fetching events for category=${categoryId}` +
          (lastEventId !== undefined ? ` lastEventId=${lastEventId}` : ''),
      );

      const events = await this.fetchWithRetry(() =>
        firstValueFrom(
          this.httpService.get<GoEvent[]>(`${GOOUT_BASE_URL}/events/tailored`, {
            params,
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 30_000,
          }),
        ).then((r) => r.data),
      );

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

  private transformEvents(
    goEvents: { event: GoEvent; venueType: VenueType }[],
  ): {
    venues: Omit<Venue, 'id'>[];
    events: (Omit<Event, 'id'> & { id?: string })[];
  } {
    const venueMap = new Map<number, Omit<Venue, 'id'>>();
    const events: (Omit<Event, 'id'> & { id?: string })[] = [];

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
        acc[v.type] = (acc[v.type] || 0) + 1;
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
