import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway],
  exports: [ChatsService],
})
export class ChatsModule {}
