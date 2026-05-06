import { Injectable, Logger } from '@nestjs/common';
import { GoOutScraperService } from './go-out-scraper.service';
import { InstagramVenueScraperService } from '../../instagram/instagram-venue-scraper.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { R2Service } from '../../r2/r2.service';
import { instagramUsernameList } from '../instagram-username-list';
import { Venue } from '../interfaces/venue.interface';
import { Event } from '../interfaces/event.interface';

export interface ScrapeStats {
  venues: {
    created: number;
    updated: number;
    skipped: number;
  };
  events: {
    created: number;
    duplicates: number;
    deleted: number;
    drafted: number;
  };
  errors: string[];
}

function extractInstagramUsername(instagramUrl?: string): string | null {
  if (!instagramUrl) return null;
  const match = instagramUrl.match(/instagram\.com\/([^/]+)\/?/);
  return match?.[1]?.toLowerCase() ?? null;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class UnitedScraperService {
  private readonly logger = new Logger(UnitedScraperService.name);

  constructor(
    private readonly goOutScraperService: GoOutScraperService,
    private readonly instagramVenueScraperService: InstagramVenueScraperService,
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
  ) {}

  async runPipeline(): Promise<ScrapeStats> {
    const stats: ScrapeStats = {
      venues: { created: 0, updated: 0, skipped: 0 },
      events: { created: 0, duplicates: 0, deleted: 0, drafted: 0 },
      errors: [],
    };

    this.logger.log('=== Pipeline started ===');

    // Step 1: Run GO scraper
    this.logger.log('[Step 1/8] Running GO scraper...');
    let goData: {
      venues: Omit<Venue, 'id'>[];
      events: (Omit<Event, 'id'> & { id?: number })[];
    } = { venues: [], events: [] };

    try {
      goData = await this.goOutScraperService.scrape();
      this.logger.log(
        `[Step 1/8] GO scraper done: ${goData.venues.length} venues, ${goData.events.length} events`,
      );
    } catch (err) {
      const msg = `GO scraper failed: ${(err as Error).message}`;
      this.logger.error(`[Step 1/8] ${msg}`);
      stats.errors.push(msg);
    }

    // Step 2: Save GO data to DB
    this.logger.log('[Step 2/8] Saving GO data to Supabase...');
    try {
      const goSaved = await this.supabaseService.saveScrapedData(goData);
      stats.events.created += goSaved.events;
      this.logger.log(
        `[Step 2/8] GO data saved: ${goSaved.venues} venues, ${goSaved.events} events`,
      );
    } catch (err) {
      const msg = `Failed to save GO data: ${(err as Error).message}`;
      this.logger.error(`[Step 2/8] ${msg}`);
      stats.errors.push(msg);
    }

    // Step 3: Fetch existing venues from Supabase and build username → id map
    this.logger.log('[Step 3/8] Fetching existing venues from Supabase...');
    const existingVenues = await this.supabaseService.fetchAllVenues();
    const existingVenuesMap = new Map<string, { id: number; name: string }>();
    for (const venue of existingVenues) {
      const username = extractInstagramUsername(venue.instagram_url);
      if (username) {
        existingVenuesMap.set(username, { id: venue.id, name: venue.name });
      }
    }
    this.logger.log(
      `[Step 3/8] Fetched ${existingVenues.length} venues (${existingVenuesMap.size} with Instagram URLs)`,
    );

    // Step 4: Normalise username list and split into new vs existing
    this.logger.log('[Step 4/8] Resolving Instagram username list...');
    const normalizedUsernames = instagramUsernameList.map((u) =>
      u.toLowerCase().trim(),
    );
    const missingUsernames = normalizedUsernames.filter(
      (u) => !existingVenuesMap.has(u),
    );
    const presentUsernames = normalizedUsernames.filter((u) =>
      existingVenuesMap.has(u),
    );

    this.logger.log(
      `[Step 4/8] ${normalizedUsernames.length} usernames total — ${missingUsernames.length} new, ${presentUsernames.length} existing`,
    );
    if (missingUsernames.length > 0) {
      this.logger.log(
        `[Step 4/8] New venues to create: ${missingUsernames.join(', ')}`,
      );
    }

    const useInstagramPicture =
      process.env.USE_INSTAGRAM_VENUE_PICTURE === 'true';

    // Collect IG events with their resolved venue IDs
    const allIgEvents: (Omit<Event, 'id'> & {
      id?: number;
      resolvedVenueId: number;
    })[] = [];

    // Step 5: Handle missing venues — scrape and create in DB
    this.logger.log(
      `[Step 5/8] Scraping ${missingUsernames.length} new venue(s)...`,
    );
    for (const username of missingUsernames) {
      try {
        this.logger.log(`[Step 5/8] @${username}: scraping new venue...`);
        const { venue, events } =
          await this.instagramVenueScraperService.scrapeNewVenue(username);
        const venueId = await this.supabaseService.createVenue(venue);
        stats.venues.created++;
        this.logger.log(
          `[Step 5/8] @${username}: created venue id=${venueId}, ${events.length} post(s) extracted`,
        );

        for (const event of events) {
          allIgEvents.push({ ...event, resolvedVenueId: venueId });
        }
      } catch (err) {
        const msg = `Failed to create venue @${username}: ${(err as Error).message}`;
        this.logger.error(`[Step 5/8] ${msg}`);
        stats.errors.push(msg);
      }
    }
    this.logger.log(
      `[Step 5/8] Done — ${stats.venues.created} new venue(s) created`,
    );

    // Step 6: Handle existing venues — optionally update profile picture, always scrape events
    this.logger.log(
      `[Step 6/8] Scraping events for ${presentUsernames.length} existing venue(s)...`,
    );
    for (const username of presentUsernames) {
      const { id: venueId } = existingVenuesMap.get(username)!;
      try {
        this.logger.log(
          `[Step 6/8] @${username}: scraping events (venue id=${venueId})...`,
        );
        const { events, profilePictureUrl } =
          await this.instagramVenueScraperService.scrapeEventsForVenue(
            username,
          );
        this.logger.log(
          `[Step 6/8] @${username}: ${events.length} post(s) extracted`,
        );

        if (useInstagramPicture && profilePictureUrl) {
          try {
            this.logger.log(
              `[Step 6/8] @${username}: uploading profile picture to R2...`,
            );
            const picR2 = await this.r2Service.downloadAndUpload(
              profilePictureUrl,
              `scraped/instagram/${username}/profile.webp`,
            );
            if (picR2) {
              await this.supabaseService.updateVenuePicture(venueId, picR2);
              stats.venues.updated++;
              this.logger.log(
                `[Step 6/8] @${username}: profile picture updated`,
              );
            } else {
              this.logger.warn(
                `[Step 6/8] @${username}: profile picture upload returned null, skipping`,
              );
              stats.venues.skipped++;
            }
          } catch (picErr) {
            const msg = `Failed to update profile picture @${username}: ${(picErr as Error).message}`;
            this.logger.error(`[Step 6/8] ${msg}`);
            stats.errors.push(msg);
            stats.venues.skipped++;
          }
        } else {
          stats.venues.skipped++;
        }

        for (const event of events) {
          allIgEvents.push({ ...event, resolvedVenueId: venueId });
        }
      } catch (err) {
        const msg = `Failed to scrape events @${username}: ${(err as Error).message}`;
        this.logger.error(`[Step 6/8] ${msg}`);
        stats.errors.push(msg);
        stats.venues.skipped++;
      }
    }
    this.logger.log(
      `[Step 6/8] Done — ${allIgEvents.length} total IG event(s) collected`,
    );

    // Step 7: Deduplicate IG events against GO events by normalised title
    this.logger.log(
      `[Step 7/8] Deduplicating ${allIgEvents.length} IG event(s) against ${goData.events.length} GO event(s)...`,
    );
    const goTitles = new Set(goData.events.map((e) => normalizeTitle(e.title)));

    const finalIgEvents = allIgEvents.map((event) => {
      const normalized = normalizeTitle(event.title);
      if (goTitles.has(normalized)) {
        stats.events.duplicates++;
        stats.events.drafted++;
        return { ...event, status: 'draft' as const };
      }
      if (event.status === 'draft') {
        stats.events.drafted++;
      }
      return event;
    });
    this.logger.log(
      `[Step 7/8] Deduplication done — ${stats.events.duplicates} duplicate(s) drafted, ${finalIgEvents.length} event(s) remaining`,
    );

    // Step 8: Persist IG events grouped by venue
    this.logger.log(`[Step 8/8] Persisting IG events to Supabase...`);
    const eventsByVenue = new Map<
      number,
      (Omit<Event, 'id'> & { id?: number })[]
    >();
    for (const event of finalIgEvents) {
      const venueId = event.resolvedVenueId;
      if (!eventsByVenue.has(venueId)) eventsByVenue.set(venueId, []);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { resolvedVenueId: _rid, ...eventData } = event;
      eventsByVenue.get(venueId)!.push(eventData);
    }

    for (const [venueId, events] of eventsByVenue) {
      try {
        const saved = await this.supabaseService.saveVenueEvents(
          events,
          venueId,
        );
        stats.events.created += saved;
        this.logger.log(
          `[Step 8/8] Venue id=${venueId}: ${saved} event(s) saved`,
        );
      } catch (err) {
        const msg = `Failed to save events for venue ${venueId}: ${(err as Error).message}`;
        this.logger.error(`[Step 8/8] ${msg}`);
        stats.errors.push(msg);
      }
    }

    // Step 8b: Delete old/expired events
    this.logger.log('[Step 8/8] Deleting old/expired events...');
    try {
      stats.events.deleted = await this.supabaseService.deleteOldEvents();
      this.logger.log(
        `[Step 8/8] Deleted ${stats.events.deleted} old event(s)`,
      );
    } catch (err) {
      const msg = `Failed to delete old events: ${(err as Error).message}`;
      this.logger.error(`[Step 8/8] ${msg}`);
      stats.errors.push(msg);
    }

    this.logger.log('=== Pipeline complete ===');
    this.logger.log(JSON.stringify(stats, null, 2));
    return stats;
  }
}
