import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { scrapers } from './scrapers.config';
import { GoOutScraperService } from './scrapers/go-out/go-out-scraper.service';
import { UnitedScraperService } from './services/united-scraper.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { GuestListSerbiaScraperService } from './scrapers/guest-list/guest-list-serbia-scraper.service';

@UseGuards(AdminGuard)
@Controller('scrape')
export class ScrapeController {
  constructor(
    private readonly goOutScraperService: GoOutScraperService,
    private readonly guestListSerbiaScraperService: GuestListSerbiaScraperService,
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
      console.log('Scraped data:', data);
      // const result = await this.supabaseService.saveScrapedData(data);
      // const deletedOldEvents = await this.supabaseService.deleteOldEvents();

      return { data };
    }

    if (id === scrapers.guestListSerbia) {
      const data = await this.guestListSerbiaScraperService.scrape();
      const result = await this.supabaseService.saveScrapedData(data);
      const deletedOldEvents = await this.supabaseService.deleteOldEvents();

      return { ...result, deletedOldEvents };
    }

    throw new NotFoundException(`Scraper with id ${id} not found`);
  }
}
