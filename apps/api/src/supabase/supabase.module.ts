import { Module } from '@nestjs/common';
import { ScrapedDataService } from './scraped-data.service';
import { SupabaseService } from './supabase.service';

@Module({
  providers: [SupabaseService, ScrapedDataService],
  exports: [SupabaseService, ScrapedDataService],
})
export class SupabaseModule {}
