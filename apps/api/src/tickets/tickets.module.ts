import { Module } from '@nestjs/common';
import { GuestSafetyModule } from '../guest-safety/guest-safety.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [SupabaseModule, UsersModule, GuestSafetyModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
