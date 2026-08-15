import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ScraperService } from './services/scrape.service';

@UseGuards(AdminGuard)
@Controller('scrape')
export class ScrapeController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get()
  async scrapeAll() {
    return this.scraperService.scrapeWithAll();
  }

  @Get(':scraperId')
  async scrape(@Param('scraperId') scraperId: number) {
    return this.scraperService.scrapeWithSingleScraper(scraperId);
  }
}
