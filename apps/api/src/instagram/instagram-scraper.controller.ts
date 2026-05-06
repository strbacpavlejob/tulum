import { Controller, Post, Param, Logger } from '@nestjs/common';
import { InstagramVenueScraperService } from './instagram-venue-scraper.service';

@Controller('instagram')
export class InstagramScraperController {
  private readonly logger = new Logger(InstagramScraperController.name);

  constructor(
    private readonly instagramVenueScraperService: InstagramVenueScraperService,
  ) {}

  @Post('scrape/venues')
  async scrapeAllVenues() {
    this.logger.log(
      'Starting Instagram venue scrape for all configured usernames...',
    );
    return this.instagramVenueScraperService.scrapeAllVenues();
  }

  @Post('scrape/venues/:username')
  async scrapeVenue(@Param('username') username: string) {
    this.logger.log(`Starting Instagram venue scrape for @${username}...`);
    const data = await this.instagramVenueScraperService.scrapeVenue(username);
    return data;
  }
}
