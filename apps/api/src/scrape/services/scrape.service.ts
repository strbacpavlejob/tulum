/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConflictException, Injectable, Logger } from '@nestjs/common';

import { parseDbTimestamp } from '../../common/db-timestamp';
import { Scraper } from '../domain/scraper.interface';
import { EventZekaScraperService } from '../scrapers/eventzeka/eventzeka-scraper.service';
import { GoOutScraperService } from '../scrapers/go-out/go-out-scraper.service';
import { GuestListSerbiaScraperService } from '../scrapers/guest-list/guest-list-serbia-scraper.service';
import { InstagramScraperService } from '../scrapers/instagram/instagram-scraper.service';
import { CleanupService } from '../../cleanup/cleanup.service';
import { ScrapedDataService } from '../../supabase/scraped-data.service';
import { DuplicateCheckerService } from '../../duplicate-checker/duplicate-checker.service';
import { ExternalPicturesService } from '../../external-pictures/external-pictures.service';

interface ExistingVenueContactRow {
  phoneNumber?: string | null;
  instagramHandle?: string | null;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly goOutScraperService: GoOutScraperService,
    private readonly guestListSerbiaScraperService: GuestListSerbiaScraperService,
    private readonly instagramScraperService: InstagramScraperService,
    private readonly eventZekaScraperService: EventZekaScraperService,
    private readonly duplicateCheckerService: DuplicateCheckerService,
    private readonly scrapedDataService: ScrapedDataService,
    private readonly cleanupService: CleanupService,
    private readonly externalPicturesService: ExternalPicturesService,
  ) {}

  private getScraper(scraperId: number): Scraper {
    switch (scraperId) {
      case 1:
        return this.goOutScraperService;

      case 2:
        return this.guestListSerbiaScraperService;

      case 3:
        return this.instagramScraperService;

      case 4:
        return this.eventZekaScraperService;

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
      this.scrapedDataService.getExistingVenuesWithContacts(),
      this.scrapedDataService.getExistingEvents(),
    ]).then(([venues, events]) => ({ venues, events }));
  }

  /*
   * getExistingVenuesWithContacts returns camelCase rows with the venue's
   * contact as venueContacts. Its Instagram account and phone let the
   * duplicate checker recognise a venue that another source names
   * differently.
   */
  private mapToExistingVenues(
    data: any[],
  ): Parameters<DuplicateCheckerService['filterDuplicateVenues']>[1] {
    return (data ?? []).map((v) => {
      const contacts = (v.venueContacts ?? v.venue_contacts) as
        | ExistingVenueContactRow
        | ExistingVenueContactRow[]
        | null
        | undefined;
      const contact = Array.isArray(contacts) ? contacts[0] : contacts;

      return {
        id: v.id as string,
        name: v.name as string,
        address: (v.address as string | null) ?? null,
        latitude: (v.latitude as number | null) ?? null,
        longitude: (v.longitude as number | null) ?? null,
        min_age_male:
          ((v.minAgeMale ?? v.min_age_male) as number | null) ?? null,
        min_age_female:
          ((v.minAgeFemale ?? v.min_age_female) as number | null) ?? null,
        contact: contact
          ? {
              phoneNumber: contact.phoneNumber ?? null,
              instagramHandle: contact.instagramHandle ?? null,
            }
          : null,
      };
    });
  }

  private mapToExistingEvents(
    data: any[],
  ): Parameters<DuplicateCheckerService['filterDuplicateEvents']>[1] {
    return (data ?? []).map((e) => ({
      id: e.id as string,
      venueId: e.venue_id as string,
      title: e.title as string,
      description: (e.description as string | null) ?? null,
      startDateTime: parseDbTimestamp(e.start_date_time),
      endDateTime: parseDbTimestamp(e.end_date_time),
    }));
  }

  async scrapeWithSingleScraper(scraperId: number) {
    const scraper = this.getScraper(scraperId);

    const existingData = await this.getExistingData();

    const existingVenues = this.mapToExistingVenues(existingData.venues);
    const existingEvents = this.mapToExistingEvents(existingData.events);

    const { venues: scrapedVenues, events: scrapedEvents } =
      await scraper.scrape(existingData);

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
      await this.scrapedDataService.saveScrapedData({
        venues: filteredScrapedVenues,
        events: filteredScrapedEvents,
      });

    const deletedOldEvents = await this.cleanupService.deleteOldEvents();

    await this.storeExternalPictures();

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

  /*
   * Scrapers save pictures as the source links them; this stores them in
   * R2 and points the rows there, before Instagram's links expire. A run
   * already going, or a failed one, leaves them to the hourly run.
   */
  private async storeExternalPictures(): Promise<void> {
    try {
      await this.externalPicturesService.storeExternalPictures();
    } catch (error) {
      if (error instanceof ConflictException) return;

      this.logger.error(
        `Storing scraped pictures failed: ${(error as Error).message}`,
      );
    }
  }

  async scrapeWithMultipleScrapers(scraperIds: number[]) {
    let savedVenues = 0;
    let savedEvents = 0;
    let deletedOldEvents = 0;

    for (const scraperId of scraperIds) {
      const result = await this.scrapeWithSingleScraper(scraperId);

      savedVenues += result.savedVenues;
      savedEvents += result.savedEvents;
      deletedOldEvents += result.deletedOldEvents;
    }
    this.logScraperResult(
      0, // 0 indicates all scrapers
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
}
