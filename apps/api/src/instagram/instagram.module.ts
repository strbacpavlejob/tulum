import { Module } from '@nestjs/common';
import { InstagramVenueScraperService } from './instagram-venue-scraper.service';
import { InstagramScraperController } from './instagram-scraper.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { R2Module } from '../r2/r2.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [SupabaseModule, R2Module, UsersModule],
  controllers: [InstagramScraperController],
  providers: [InstagramVenueScraperService],
  exports: [InstagramVenueScraperService],
})
export class InstagramModule {}
