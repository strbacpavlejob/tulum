import { Logger } from '@nestjs/common';

import { ScrapedEvent, ScrapedVenue } from '../domain/scraper.interface';
import { ScraperSource } from '../domain/scraper-config';

export interface RetryLogDetails {
  attempt: number;
  retries: number;
  waitMs: number;
  status?: number;
}

export class ScraperLogs {
  private readonly logger: Logger;

  constructor(
    context: string,
    private readonly source: ScraperSource,
  ) {
    this.logger = new Logger(context);
  }

  authenticationStarted(): void {
    this.logger.log(`[${this.source}] Authentication started`);
  }

  authenticationSuccessful(): void {
    this.logger.log(`[${this.source}] Authentication successful`);
  }

  categoryScrapingStarted(
    categoryId: string | number,
    venueType: string,
  ): void {
    this.logger.log(
      `[${this.source}] Scraping category ${categoryId} (${venueType})`,
    );
  }

  categoryScrapingCompleted(
    categoryId: string | number,
    venueType: string,
    eventCount: number,
  ): void {
    this.logger.log(
      `[${this.source}] Category ${categoryId} (${venueType}): ` +
        `fetched ${eventCount} events`,
    );
  }

  allCategoriesFetched(eventCount: number): void {
    this.logger.log(
      `[${this.source}] Total events fetched across all categories: ` +
        eventCount,
    );
  }

  paginationRequest(
    categoryId: string | number,
    categoryName?: string,
    lastEventId?: number,
  ): void {
    const category = categoryName
      ? `${categoryName} (${categoryId})`
      : String(categoryId);

    const pagination =
      lastEventId === undefined ? '' : `, lastEventId=${lastEventId}`;

    this.logger.log(
      `[${this.source}] Fetching events for category=${category}${pagination}`,
    );
  }

  paginationPageFetched(categoryId: string | number, eventCount: number): void {
    this.logger.log(
      `[${this.source}] Fetched ${eventCount} events ` +
        `for category ${categoryId}`,
    );
  }

  paginationCompleted(
    categoryId: string | number,
    totalEventCount: number,
  ): void {
    this.logger.log(
      `[${this.source}] Pagination completed for category ` +
        `${categoryId}. Total events: ${totalEventCount}`,
    );
  }

  paginationStopped(categoryId: string | number, lastEventId?: number): void {
    this.logger.warn(
      `[${this.source}] Pagination stopped for category ${categoryId} ` +
        `because lastEventId ${lastEventId ?? 'undefined'} did not change`,
    );
  }

  requestRetry({ attempt, retries, waitMs, status }: RetryLogDetails): void {
    this.logger.warn(
      `[${this.source}] Request failed ` +
        `(attempt ${attempt}/${retries}, ` +
        `status ${status ?? 'no response'}). ` +
        `Retrying in ${waitMs}ms`,
    );
  }

  transformationCompleted(
    venues: ScrapedVenue[],
    events: ScrapedEvent[],
  ): void {
    const venueTypeCounts = this.countVenueTypes(venues);

    this.logger.log(
      `[${this.source}] Mapped ${venues.length} unique venues ` +
        `and ${events.length} events`,
    );

    this.logger.log(
      `[${this.source}] Venue type breakdown: ` +
        JSON.stringify(venueTypeCounts),
    );
  }

  private countVenueTypes(venues: ScrapedVenue[]): Record<string, number> {
    return venues.reduce<Record<string, number>>((result, venue) => {
      const venueType = String(venue.venueType);

      result[venueType] = (result[venueType] ?? 0) + 1;

      return result;
    }, {});
  }
  info(message: string): void {
    this.logger.log(`[${this.source}] ${message}`);
  }

  warning(message: string): void {
    this.logger.warn(`[${this.source}] ${message}`);
  }

  debug(message: string): void {
    this.logger.debug(`[${this.source}] ${message}`);
  }

  error(message: string, trace?: string): void {
    this.logger.error(`[${this.source}] ${message}`, trace);
  }

  scrapeStarted(): void {
    this.info('Scrape started');
  }

  scrapeCompleted(venueCount: number, eventCount: number): void {
    this.info(
      `Scrape completed: ${venueCount} unique venues, ${eventCount} events`,
    );
  }
}
