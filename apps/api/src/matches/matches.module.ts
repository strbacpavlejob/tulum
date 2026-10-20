import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [SupabaseModule, UsersModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
