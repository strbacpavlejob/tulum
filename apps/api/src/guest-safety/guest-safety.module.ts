import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { BlocksController } from './blocks.controller';
import { GuestReportsController } from './guest-reports.controller';
import { GuestReportsService } from './guest-reports.service';
import { GuestSafetyService } from './guest-safety.service';

// Blocks, reports and who sees whom (QA TASK-001). The guests, tickets,
// matches and chats modules use GuestSafetyService to enforce them.
@Module({
  imports: [SupabaseModule, UsersModule],
  controllers: [BlocksController, GuestReportsController],
  providers: [GuestSafetyService, GuestReportsService],
  exports: [GuestSafetyService],
})
export class GuestSafetyModule {}
