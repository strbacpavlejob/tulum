import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ExternalPicturesService } from './external-pictures.service';

@Injectable()
export class ExternalPicturesCronService {
  private readonly logger = new Logger(ExternalPicturesCronService.name);

  constructor(
    private readonly externalPicturesService: ExternalPicturesService,
  ) {}

  // Runs every hour at :40 (server timezone). Each scrape also runs it once
  // it has saved, so this run tries failed downloads again and takes what a
  // run left. A run with nothing to store reads the database and stops.
  @Cron('40 * * * *', { name: 'external-pictures-hourly' })
  async storeExternalPictures(): Promise<void> {
    try {
      await this.externalPicturesService.storeExternalPictures();
    } catch (error) {
      // The previous run, or one a scrape or an admin started, is still going.
      if (error instanceof ConflictException) return;

      this.logger.error(
        'Scheduled external picture run failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
