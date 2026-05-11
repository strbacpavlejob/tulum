import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [SupabaseModule],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
