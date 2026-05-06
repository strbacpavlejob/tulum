import { Module } from '@nestjs/common';
import { InstagramModule } from '../instagram/instagram.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { EventsController } from './events.controller';

@Module({
  imports: [SupabaseModule, InstagramModule],
  controllers: [EventsController],
})
export class EventsModule {}
