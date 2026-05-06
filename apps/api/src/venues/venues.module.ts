import { Module } from '@nestjs/common';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [SupabaseModule, R2Module],
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
