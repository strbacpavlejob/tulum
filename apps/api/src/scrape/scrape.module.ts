import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScrapeController } from './scrape.controller';
import { GoOutScraperService } from './scrapers/go-out/go-out-scraper.service';
import { UnitedScraperService } from './services/united-scraper.service';
import { ScrapeCronService } from './services/scrape-cron.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { InstagramModule } from '../instagram/instagram.module';
import { R2Module } from '../r2/r2.module';
import { GuestListSerbiaScraperService } from './scrapers/guest-list/guest-list-serbia-scraper.service';

@Module({
  imports: [HttpModule, SupabaseModule, InstagramModule, R2Module, UsersModule],
  controllers: [ScrapeController],
  providers: [
    GoOutScraperService,
    GuestListSerbiaScraperService,
    UnitedScraperService,
    ScrapeCronService,
  ],
})
export class ScrapeModule {}
