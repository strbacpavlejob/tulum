import { Module } from '@nestjs/common';
import { GuestSafetyModule } from '../guest-safety/guest-safety.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { R2Module } from '../r2/r2.module';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [SupabaseModule, R2Module, GuestSafetyModule],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
