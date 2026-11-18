import { Module } from '@nestjs/common';
import { CleanupModule } from '../cleanup/cleanup.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { InstagramModule } from '../instagram/instagram.module';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { EventsCrudController } from './events-crud.controller';
import { EventsCrudService } from './events-crud.service';
import { EventsFeedService } from './events-feed.service';
import { EventsController } from './events.controller';

@Module({
  imports: [
    SupabaseModule,
    CleanupModule,
    InstagramModule,
    R2Module,
    FavoritesModule,
    UsersModule,
  ],
  controllers: [EventsController, EventsCrudController],
  providers: [EventsCrudService, EventsFeedService],
})
export class EventsModule {}
