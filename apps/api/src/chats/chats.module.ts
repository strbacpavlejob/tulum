import { Module } from '@nestjs/common';
import { GuestSafetyModule } from '../guest-safety/guest-safety.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';
import { InboxPushService } from './inbox-push.service';

@Module({
  imports: [SupabaseModule, UsersModule, GuestSafetyModule],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway, InboxPushService],
  exports: [ChatsService, InboxPushService],
})
export class ChatsModule {}
