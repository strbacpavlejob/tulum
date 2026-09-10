import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ScraperService } from './scrape.service';

@Injectable()
export class ScrapeCronService {
  private readonly logger = new Logger(ScrapeCronService.name);

  constructor(private readonly scraperService: ScraperService) {}

  // Runs every Monday and Thursday at 10:30 (server timezone).
  @Cron('30 10 * * 1,4', { name: 'scrape-all-monday-thursday-1030' })
  async runAllScrapers(): Promise<void> {
    this.logger.log('Starting scheduled scrape for all scrapers');

    try {
      await this.scraperService.scrapeWithAll();
    } catch (error) {
      this.logger.error(
        'Scheduled scrape failed for all scrapers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
