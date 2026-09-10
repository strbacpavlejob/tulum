import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScrapeController } from './scrape.controller';
import { GoOutScraperService } from './scrapers/go-out/go-out-scraper.service';
import { ScrapeCronService } from './services/scrape-cron.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { GeocoderModule } from '../geocoder/geocoder.module';
import { DuplicateCheckerModule } from '../duplicate-checker/duplicate-checker.module';
import { UsersModule } from '../users/users.module';
import { InstagramModule } from '../instagram/instagram.module';
import { R2Module } from '../r2/r2.module';
import { GuestListSerbiaScraperService } from './scrapers/guest-list/guest-list-serbia-scraper.service';
import { InstagramScraperService } from './scrapers/instagram/instagram-scraper.service';
import { ScraperService } from './services/scrape.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SupabaseModule,
    InstagramModule,
    R2Module,
    UsersModule,
    GeocoderModule,
    DuplicateCheckerModule,
  ],
  controllers: [ScrapeController],
  providers: [
    GoOutScraperService,
    GuestListSerbiaScraperService,
    InstagramScraperService,
    ScrapeCronService,
    ScraperService,
  ],
})
export class ScrapeModule {}
