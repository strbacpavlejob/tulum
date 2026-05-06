import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ScrapeController } from './scrape.controller';
import { GoOutScraperService } from './services/go-out-scraper.service';
import { UnitedScraperService } from './services/united-scraper.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { InstagramModule } from '../instagram/instagram.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [HttpModule, SupabaseModule, InstagramModule, R2Module],
  controllers: [ScrapeController],
  providers: [GoOutScraperService, UnitedScraperService],
})
export class ScrapeModule {}
