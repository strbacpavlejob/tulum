import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapeModule } from './scrape/scrape.module';
import { EventsModule } from './events/events.module';
import { InstagramModule } from './instagram/instagram.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScrapeModule,
    EventsModule,
    InstagramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
