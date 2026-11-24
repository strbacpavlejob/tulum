import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { VenuePicturesService } from './venue-pictures.service';

@Injectable()
export class VenuePicturesCronService {
  private readonly logger = new Logger(VenuePicturesCronService.name);

  constructor(private readonly venuePicturesService: VenuePicturesService) {}

  // Runs every hour at :20 (server timezone), so a venue a scrape imports
  // gets its picture within the hour. A run with no venue due asks Apify
  // nothing, and the job's monthly Apify budget caps what runs spend.
  @Cron('20 * * * *', { name: 'venue-pictures-hourly' })
  async fillMissingPictures(): Promise<void> {
    try {
      await this.venuePicturesService.fillMissingPictures();
    } catch (error) {
      // The previous run, or one an admin started, is still going.
      if (error instanceof ConflictException) return;

      this.logger.error(
        'Scheduled venue picture run failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
