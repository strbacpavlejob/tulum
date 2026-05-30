import { Module } from '@nestjs/common';
import { InstagramModule } from '../instagram/instagram.module';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [SupabaseModule, R2Module, InstagramModule],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
