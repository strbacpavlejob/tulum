import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { ScrapeModule } from './scrape/scrape.module';
import { EventsModule } from './events/events.module';
import { InstagramModule } from './instagram/instagram.module';
import { ChatsModule } from './chats/chats.module';
import { FavoritesModule } from './favorites/favorites.module';
import { GeocoderModule } from './geocoder/geocoder.module';
import { MatchesModule } from './matches/matches.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';
import { VenuesModule } from './venues/venues.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScrapeModule,
    EventsModule,
    InstagramModule,
    ChatsModule,
    FavoritesModule,
    GeocoderModule,
    MatchesModule,
    StatisticsModule,
    TicketsModule,
    UsersModule,
    VenuesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
