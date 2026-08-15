/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';

import { Scraper } from '../domain/scraper.interface';
import { GoOutScraperService } from '../scrapers/go-out/go-out-scraper.service';
import { GuestListSerbiaScraperService } from '../scrapers/guest-list/guest-list-serbia-scraper.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { DuplicateCheckerService } from 'src/duplicate-checker/duplicate-checker.service';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly goOutScraperService: GoOutScraperService,
    private readonly guestListSerbiaScraperService: GuestListSerbiaScraperService,
    private readonly duplicateCheckerService: DuplicateCheckerService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private getScraper(scraperId: number): Scraper {
    switch (scraperId) {
      case 1:
        return this.goOutScraperService;

      case 2:
        return this.guestListSerbiaScraperService;

      default:
        throw new Error(`Scraper with id ${scraperId} not found`);
    }
  }

  private logScraperResult(
    scraperId: number,
    savedVenues: number,
    savedEvents: number,
    deletedOldEvents: number,
  ): void {
    this.logger.log(
      `Scraper ${scraperId} completed. ` +
        `Saved ${savedVenues} venues, ${savedEvents} events. ` +
        `Deleted ${deletedOldEvents} old events.`,
    );
  }

  private getExistingData() {
    return Promise.all([
      this.supabaseService.getExistingVenues(),
      this.supabaseService.getExistingEvents(),
    ]).then(([venues, events]) => ({ venues, events }));
  }

  private mapToExistingVenues(
    data: any[],
  ): Parameters<DuplicateCheckerService['filterDuplicateVenues']>[1] {
    return (data ?? []).map((v) => ({
      id: v.id as string,
      name: v.name as string,
      address: (v.address as string | null) ?? null,
      latitude: (v.latitude as number | null) ?? null,
      longitude: (v.longitude as number | null) ?? null,
      min_age_male: (v.min_age_male as number | null) ?? null,
      min_age_female: (v.min_age_female as number | null) ?? null,
      contact: null,
    }));
  }

  private mapToExistingEvents(
    data: any[],
  ): Parameters<DuplicateCheckerService['filterDuplicateEvents']>[1] {
    return (data ?? []).map((e) => ({
      id: e.id as string,
      venueId: e.venue_id as string,
      title: e.title as string,
      description: (e.description as string | null) ?? null,
      startDateTime: new Date(e.start_date_time as string),
      endDateTime: new Date(e.end_date_time as string),
    }));
  }

  async scrapeWithSingleScraper(scraperId: number) {
    const scraper = this.getScraper(scraperId);

    const existingData = await this.getExistingData();

    const existingVenues = this.mapToExistingVenues(existingData.venues);
    const existingEvents = this.mapToExistingEvents(existingData.events);

    const { venues: scrapedVenues, events: scrapedEvents } =
      await scraper.scrape();

    const filteredScrapedVenues =
      this.duplicateCheckerService.filterDuplicateVenues(
        scrapedVenues,
        existingVenues,
      );

    const filteredScrapedEvents =
      this.duplicateCheckerService.filterDuplicateEvents(
        scrapedEvents,
        existingEvents,
        existingVenues,
      );

    const { venues: savedVenues, events: savedEvents } =
      await this.supabaseService.saveScrapedData({
        venues: filteredScrapedVenues,
        events: filteredScrapedEvents,
      });

    const deletedOldEvents = await this.supabaseService.deleteOldEvents();

    this.logScraperResult(
      scraperId,
      savedVenues,
      savedEvents,
      deletedOldEvents,
    );

    return {
      savedVenues,
      savedEvents,
      deletedOldEvents,
    };
  }

  async scrapeWithAll() {
    let savedVenues = 0;
    let savedEvents = 0;
    let deletedOldEvents = 0;

    const scraperIds = [1, 2];

    for (const scraperId of scraperIds) {
      const result = await this.scrapeWithSingleScraper(scraperId);

      savedVenues += result.savedVenues;
      savedEvents += result.savedEvents;
      deletedOldEvents += result.deletedOldEvents;
    }

    return {
      savedVenues,
      savedEvents,
      deletedOldEvents,
    };
  }
}
