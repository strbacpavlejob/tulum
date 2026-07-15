import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScrapeController } from './scrape.controller';
import { GoOutScraperService } from './services/go-out-scraper.service';
import { GuestListSerbiaScraperService } from './services/guest-list-serbia-scraper.service';
import { UnitedScraperService } from './services/united-scraper.service';
import { ScrapeCronService } from './services/scrape-cron.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { InstagramModule } from '../instagram/instagram.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [HttpModule, SupabaseModule, InstagramModule, R2Module],
  controllers: [ScrapeController],
  providers: [
    GoOutScraperService,
    GuestListSerbiaScraperService,
    UnitedScraperService,
    ScrapeCronService,
  ],
})
export class ScrapeModule {}
