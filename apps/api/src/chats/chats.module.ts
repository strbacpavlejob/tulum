import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
