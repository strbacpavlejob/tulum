import { Module } from '@nestjs/common';
import { DuplicateCheckerService } from './duplicate-checker.service';
import { ScraperLogs } from '../scrape/shared/scraper-logs';
import { ScraperSource } from '../scrape/domain/scraper-config';

@Module({
  providers: [
    DuplicateCheckerService,
    {
      provide: ScraperLogs,
      useFactory: () =>
        new ScraperLogs(DuplicateCheckerService.name, ScraperSource.GUEST_LIST),
    },
  ],
  exports: [DuplicateCheckerService],
})
export class DuplicateCheckerModule {}
