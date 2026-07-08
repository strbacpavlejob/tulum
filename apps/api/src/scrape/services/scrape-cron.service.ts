import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { scrapers } from '../scrapers.config';
import { GoOutScraperService } from './go-out-scraper.service';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ScrapeCronService {
  private readonly logger = new Logger(ScrapeCronService.name);

  constructor(
    private readonly goOutScraperService: GoOutScraperService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // Runs every Thursday at 10:30 according to the server timezone.
  @Cron('30 10 * * 4', { name: 'scrape-go-out-thursday-1030' })
  async runGoOutScrape() {
    this.logger.log(
      `Starting scheduled scrape for /scrape/${scrapers.goOut} endpoint`,
    );

    try {
      const data = await this.goOutScraperService.scrape();
      const result = await this.supabaseService.saveScrapedData(data);
      const deletedOldEvents = await this.supabaseService.deleteOldEvents();

      this.logger.log(
        `Scheduled scrape finished successfully. Venues: ${result.venues}, Events: ${result.events}, Deleted old events: ${deletedOldEvents}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scrape cron error';

      this.logger.error(
        `Scheduled scrape failed for /scrape/${scrapers.goOut}: ${message}`,
      );
    }
  }

  // Runs every Monday at 10:30 according to the server timezone.
  @Cron('30 10 * * 1', { name: 'scrape-go-out-monday-1030' })
  async runGoOutScrapeMonday() {
    await this.runGoOutScrape();
  }
}
