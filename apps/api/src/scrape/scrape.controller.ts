import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { scrapers } from './scrapers.config';
import { GoOutScraperService } from './services/go-out-scraper.service';
import { UnitedScraperService } from './services/united-scraper.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('scrape')
export class ScrapeController {
  constructor(
    private readonly goOutScraperService: GoOutScraperService,
    private readonly unitedScraperService: UnitedScraperService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async scrapeAll() {
    return this.unitedScraperService.runPipeline();
  }

  @Get(':scraperId')
  async scrape(@Param('scraperId') scraperId: string) {
    const id = parseInt(scraperId, 10);

    if (id === scrapers.goOut) {
      const data = await this.goOutScraperService.scrape();
      const result = await this.supabaseService.saveScrapedData(data);
      const deletedOldEvents = await this.supabaseService.deleteOldEvents();

      return { ...result, deletedOldEvents };
    }

    throw new NotFoundException(`Scraper with id ${id} not found`);
  }
}
