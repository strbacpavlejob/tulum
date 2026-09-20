import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ScraperService } from './scrape.service';
import { ScraperSource } from '../domain/scraper-config';

@Injectable()
export class ScrapeCronService {
  private readonly logger = new Logger(ScrapeCronService.name);

  constructor(private readonly scraperService: ScraperService) {}

  // Runs every Monday at 10:30 (server timezone).
  @Cron('30 10 * * 1', { name: 'monday-scraper-1030' })
  async mondayScraper(): Promise<void> {
    this.logger.log(
      `Starting scheduled scrape for: ${ScraperSource.GOOUT}, ${ScraperSource.GUEST_LIST}`,
    );

    try {
      await this.scraperService.scrapeWithMultipleScrapers([1, 2]);
    } catch (error) {
      this.logger.error(
        'Scheduled scrape failed for all scrapers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
  // Runs every Thursday at 10:30 (server timezone).
  @Cron('30 10 * * 4', { name: 'thursday-scraper-1030' })
  async thursdayScraper(): Promise<void> {
    this.logger.log(
      `Starting scheduled scrape for: ${ScraperSource.GOOUT}, ${ScraperSource.GUEST_LIST}, ${ScraperSource.INSTAGRAM}`,
    );

    try {
      await this.scraperService.scrapeWithMultipleScrapers([1, 2, 3]);
    } catch (error) {
      this.logger.error(
        'Scheduled scrape failed for all scrapers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
