import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { CleanupController } from './cleanup.controller';
import { CleanupService } from './cleanup.service';

@Module({
  imports: [SupabaseModule, UsersModule],
  controllers: [CleanupController],
  providers: [CleanupService],
})
export class CleanupModule {}
