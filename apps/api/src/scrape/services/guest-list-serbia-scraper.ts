import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as puppeteer from 'puppeteer';
import { SupabaseService } from '../../supabase/supabase.service';
import { Event } from '../interfaces/event.interface';
import { Venue, VenueType } from '../interfaces/venue.interface';

const BASE_URL = 'https://guestlist-serbia.com/';
const DEFAULT_EVENT_DURATION_HOURS = 4;
const DEFAULT_VENUE_CAPACITY = 100;
const DEFAULT_MIN_AGE = 18;
const BELGRADE_LATITUDE = 44.8125;
const BELGRADE_LONGITUDE = 20.4612;
const MAX_LATITUDE_DELTA = 0.03;
const MAX_LONGITUDE_DELTA = 0.05;
const VENUE_GEO_WEIGHT = 0.4;
const VENUE_NAME_WEIGHT = 0.4;
const VENUE_ADDRESS_WEIGHT = 0.2;
const VENUE_MATCH_THRESHOLD = 72;
const EVENT_TITLE_WEIGHT = 0.65;
const EVENT_TIME_WEIGHT = 0.35;
const EVENT_MATCH_THRESHOLD = 78;
const MAX_EVENT_TIME_DELTA_HOURS = 12;

type GuestListVenueCategory = {
  queryValue: 'Nightclub' | 'Tavern' | 'Restaurant';
  venueType: VenueType;
};

type ExistingVenue = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  min_age_male: number | null;
  min_age_female: number | null;
};

type ExistingEvent = {
  title: string;
  start_date_time: string;
};

type VenueMatchCandidate = {
  venue: ExistingVenue;
  score: number;
  geoScore: number;
  nameScore: number;
  addressScore: number;
};

type ParsedEventDetails = {
  title: string;
  description: string;
  startDateTime: string;
  venueName: string;
  address: string;
  venueDescription: string;
  tags: string[];
  imageUrl?: string;
  latitude: number;
  longitude: number;
  minAgeMale: number;
  minAgeFemale: number;
};

const VENUE_CATEGORIES: GuestListVenueCategory[] = [
  { queryValue: 'Nightclub', venueType: 'nightclub' },
  { queryValue: 'Tavern', venueType: 'tavern' },
  { queryValue: 'Restaurant', venueType: 'restaurant' },
];

@Injectable()
export class GuestListSerbiaScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(GuestListSerbiaScraperService.name);
  private browser: puppeteer.Browser | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  async scrape(): Promise<{
    venues: Omit<Venue, 'id'>[];
    events: (Omit<Event, 'id'> & { id?: string })[];
  }> {
    this.logger.log('Starting GuestList Serbia scrape...');

    const existingVenues = await this.fetchExistingVenues();
    const venuesByKey = new Map<string, Omit<Venue, 'id'>>();
    const events: (Omit<Event, 'id'> & { id?: string })[] = [];
    const existingEventsCache = new Map<string, ExistingEvent[]>();
    const existingVenueAgeUpdates = new Map<
      string,
      { male: number; female: number }
    >();

    for (const category of VENUE_CATEGORIES) {
      const listUrl = `${BASE_URL}?venue-type-2=${encodeURIComponent(category.queryValue)}`;
      this.logger.log(
        `Scraping category ${category.queryValue} (${category.venueType}) from ${listUrl}`,
      );

      const listHtml = await this.fetchListHtmlWithLoadMore(listUrl);
      const eventPaths = this.extractEventPaths(listHtml);

      this.logger.log(
        `Category ${category.queryValue}: found ${eventPaths.length} event detail links`,
      );

      for (const eventPath of eventPaths) {
        const eventUrl = new URL(eventPath, BASE_URL).toString();
        const detailsHtml = await this.fetchHtml(eventUrl);
        const parsed = await this.parseEventDetails(detailsHtml);

        if (!parsed) {
          this.logger.warn(
            `Skipping ${eventUrl}: unable to parse event details`,
          );
          continue;
        }

        const venueMatch = this.findBestVenueMatch(parsed, existingVenues);
        const canonicalVenueName = venueMatch?.venue.name ?? parsed.venueName;
        const venueKey = this.buildVenueKey(canonicalVenueName, parsed.address);

        if (!venueMatch && !venuesByKey.has(venueKey)) {
          venuesByKey.set(venueKey, {
            host_id: process.env.DEFAULT_VENUE_HOST_ID || 'user_test',
            name: canonicalVenueName,
            longitude: parsed.longitude,
            latitude: parsed.latitude,
            type: category.venueType,
            capacity: DEFAULT_VENUE_CAPACITY,
            address: parsed.address,
            description: parsed.venueDescription || parsed.description,
            picture: parsed.imageUrl,
            scraper: 'guestListSerbia',
            min_age_male: parsed.minAgeMale,
            min_age_female: parsed.minAgeFemale,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else if (!venueMatch) {
          const existingVenue = venuesByKey.get(venueKey)!;
          existingVenue.min_age_male = Math.max(
            existingVenue.min_age_male ?? DEFAULT_MIN_AGE,
            parsed.minAgeMale,
          );
          existingVenue.min_age_female = Math.max(
            existingVenue.min_age_female ?? DEFAULT_MIN_AGE,
            parsed.minAgeFemale,
          );
          if (!existingVenue.description && parsed.venueDescription) {
            existingVenue.description = parsed.venueDescription;
          }
          if (!existingVenue.picture && parsed.imageUrl) {
            existingVenue.picture = parsed.imageUrl;
          }
        } else if (venueMatch) {
          const previous = existingVenueAgeUpdates.get(venueMatch.venue.id);
          const maleBaseline = Math.max(
            venueMatch.venue.min_age_male ?? DEFAULT_MIN_AGE,
            previous?.male ?? DEFAULT_MIN_AGE,
          );
          const femaleBaseline = Math.max(
            venueMatch.venue.min_age_female ?? DEFAULT_MIN_AGE,
            previous?.female ?? DEFAULT_MIN_AGE,
          );

          existingVenueAgeUpdates.set(venueMatch.venue.id, {
            male: Math.max(maleBaseline, parsed.minAgeMale),
            female: Math.max(femaleBaseline, parsed.minAgeFemale),
          });
        }

        const startDate = new Date(parsed.startDateTime);
        if (Number.isNaN(startDate.getTime())) {
          this.logger.warn(
            `Skipping ${eventUrl}: invalid start date ${parsed.startDateTime}`,
          );
          continue;
        }

        const endDate = new Date(
          startDate.getTime() + DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000,
        );

        const eventVenueReference = venueMatch?.venue.id ?? venueKey;
        const existingEventsForDay = venueMatch
          ? await this.fetchExistingEventsForVenueAndDay(
              venueMatch.venue.id,
              startDate,
              existingEventsCache,
            )
          : [];

        const isDuplicate = this.isLikelyDuplicateEvent({
          title: parsed.title,
          startDateTime: startDate.toISOString(),
          venueReference: eventVenueReference,
          events,
          existingEvents: existingEventsForDay,
        });

        if (isDuplicate) {
          this.logger.debug(
            `Skipping likely duplicate event "${parsed.title}" for venue "${canonicalVenueName}" at ${startDate.toISOString()}`,
          );
          continue;
        }

        events.push({
          venue_id: eventVenueReference,
          venue_name: canonicalVenueName,
          title: parsed.title,
          description: parsed.description,
          start_date_time: startDate.toISOString(),
          end_date_time: endDate.toISOString(),
          tags: parsed.tags,
          picture: parsed.imageUrl,
          status: 'active',
          scraper: 'guestListSerbia',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (existingVenueAgeUpdates.size > 0) {
      await this.applyExistingVenueAgeUpdates(existingVenueAgeUpdates);
    }

    const venues = Array.from(venuesByKey.values());

    this.logger.log(
      `GuestList Serbia scrape complete: ${venues.length} unique venues, ${events.length} events`,
    );

    return { venues, events };
  }

  private async fetchExistingVenues(): Promise<ExistingVenue[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('venues')
      .select(
        'id, name, address, latitude, longitude, min_age_male, min_age_female',
      );

    if (error) {
      this.logger.warn(
        `Failed to fetch existing venues for dedupe: ${error.message}`,
      );
      return [];
    }

    return ((data as ExistingVenue[] | null) ?? []).filter((v) => !!v.name);
  }

  private async applyExistingVenueAgeUpdates(
    updates: Map<string, { male: number; female: number }>,
  ): Promise<void> {
    for (const [venueId, ages] of updates.entries()) {
      const { error } = await this.supabaseService
        .getClient()
        .from('venues')
        .update({
          min_age_male: ages.male,
          min_age_female: ages.female,
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId);

      if (error) {
        this.logger.warn(
          `Failed to update age limits for existing venue ${venueId}: ${error.message}`,
        );
      }
    }
  }

  private async fetchExistingEventsForVenueAndDay(
    venueId: string,
    startDate: Date,
    cache: Map<string, ExistingEvent[]>,
  ): Promise<ExistingEvent[]> {
    const dayKey = `${venueId}|${startDate.toISOString().slice(0, 10)}`;
    const cached = cache.get(dayKey);
    if (cached) return cached;

    const dayStart = new Date(startDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('events')
      .select('title, start_date_time')
      .eq('venue_id', venueId)
      .gte('start_date_time', dayStart.toISOString())
      .lt('start_date_time', dayEnd.toISOString());

    if (error) {
      this.logger.warn(
        `Failed to fetch existing events for venue ${venueId}: ${error.message}`,
      );
      cache.set(dayKey, []);
      return [];
    }

    const existingEvents =
      ((data as ExistingEvent[] | null) ?? []).filter(
        (event) => !!event.title && !!event.start_date_time,
      ) ?? [];

    cache.set(dayKey, existingEvents);
    return existingEvents;
  }

  private async fetchWithRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 2000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response
          ?.status;
        const isRetryable = !status || status >= 500;

        if (!isRetryable || attempt === retries) {
          throw err;
        }

        const wait = delayMs * 2 ** (attempt - 1);
        this.logger.warn(
          `Request failed (attempt ${attempt}/${retries}, status ${status ?? 'no response'}). Retrying in ${wait}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }

    throw new Error('Unreachable');
  }

  private async fetchHtml(url: string): Promise<string> {
    return this.fetchWithRetry(async () => {
      const response = await firstValueFrom(
        this.httpService.get<string>(url, {
          responseType: 'text',
          timeout: 30_000,
        }),
      );

      if (typeof response.data !== 'string') {
        throw new Error(`Expected HTML string response for ${url}`);
      }

      return response.data;
    });
  }

  private async fetchListHtmlWithLoadMore(url: string): Promise<string> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });

        let previousCardCount = await this.getEventCardCount(page);
        let stagnantIterations = 0;

        for (let i = 0; i < 30; i += 1) {
          const clicked = await page.evaluate(() => {
            const elements = Array.from(
              document.querySelectorAll<HTMLElement>('button, a, div, h6'),
            );

            const loadMoreText = 'load more';
            for (const element of elements) {
              const text = element.textContent?.trim().toLowerCase() ?? '';
              if (text !== loadMoreText) continue;

              const clickable = element.closest('button, a') ?? element;
              if (clickable instanceof HTMLElement) {
                clickable.click();
                return true;
              }
            }

            return false;
          });

          if (!clicked) {
            break;
          }

          try {
            await page.waitForFunction(
              (prevCount) => {
                const anchors = document.querySelectorAll(
                  'a[href*="/events/"]',
                );
                return anchors.length > prevCount;
              },
              { timeout: 7000 },
              previousCardCount,
            );
          } catch {
            // Continue and evaluate below; some pages re-render without changing anchor count immediately.
          }

          const currentCardCount = await this.getEventCardCount(page);
          if (currentCardCount <= previousCardCount) {
            stagnantIterations += 1;
            if (stagnantIterations >= 2) {
              break;
            }
          } else {
            stagnantIterations = 0;
          }

          previousCardCount = currentCardCount;
        }

        return await page.content();
      } finally {
        await page.close();
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load list page with "Load More" clicks for ${url}: ${(error as Error).message}`,
      );
      return this.fetchHtml(url);
    }
  }

  private async getEventCardCount(page: puppeteer.Page): Promise<number> {
    return page.evaluate(() => {
      return document.querySelectorAll('a[href*="/events/"]').length;
    });
  }

  private extractEventPaths(listHtml: string): string[] {
    const matches = listHtml.matchAll(
      /href=["'](\.?\/events\/[^"'#?\s]+)["']/gi,
    );
    const paths = new Set<string>();

    for (const match of matches) {
      const href = match[1];
      const pathname = new URL(href, BASE_URL).pathname;
      if (pathname.startsWith('/events/')) {
        paths.add(pathname);
      }
    }

    return Array.from(paths);
  }

  private async parseEventDetails(
    detailsHtml: string,
  ): Promise<ParsedEventDetails | null> {
    const jsonLd = this.extractEventJsonLd(detailsHtml);
    if (!jsonLd) return null;

    const title = this.sanitizeString(jsonLd.name);
    const startDateTime = this.sanitizeString(jsonLd.startDate);
    const venueName =
      this.sanitizeString(jsonLd.location?.name) ||
      this.extractVenueNameFallback(detailsHtml);
    const address =
      this.sanitizeString(jsonLd.location?.address?.streetAddress) ||
      this.extractAddressFallback(detailsHtml);

    if (!title || !startDateTime || !venueName || !address) {
      return null;
    }

    const description =
      this.sanitizeString(jsonLd.description) ||
      this.extractEventDescriptionFallback(detailsHtml) ||
      '';

    const venueDescription = this.extractAboutVenue(detailsHtml) || description;
    const tags = this.extractMusicStyleTags(detailsHtml);
    const imageUrl = this.extractImageUrl(jsonLd.image);
    const { latitude, longitude } = await this.extractCoordinates(detailsHtml);
    const { male, female } = this.parseAgeLimits(detailsHtml);

    return {
      title,
      description,
      startDateTime,
      venueName,
      address,
      venueDescription,
      tags,
      imageUrl,
      latitude,
      longitude,
      minAgeMale: male,
      minAgeFemale: female,
    };
  }

  private extractEventJsonLd(html: string): {
    name?: string;
    startDate?: string;
    description?: string;
    image?: string | string[];
    location?: {
      name?: string;
      address?: {
        streetAddress?: string;
      };
    };
  } | null {
    const scriptRegex =
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

    for (const match of html.matchAll(scriptRegex)) {
      const rawJson = match[1]?.trim();
      if (!rawJson) continue;

      try {
        const parsed = JSON.parse(rawJson) as unknown;
        const candidates = Array.isArray(parsed) ? parsed : [parsed];

        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== 'object') continue;
          const typed = candidate as Record<string, unknown>;
          const typeValue = typed['@type'];
          if (
            typeof typeValue === 'string' &&
            typeValue.toLowerCase().includes('event')
          ) {
            return {
              name: this.asString(typed.name),
              startDate: this.asString(typed.startDate),
              description: this.asString(typed.description),
              image:
                typeof typed.image === 'string' || Array.isArray(typed.image)
                  ? (typed.image as string | string[])
                  : undefined,
              location:
                typed.location && typeof typed.location === 'object'
                  ? {
                      name: this.asString(
                        (typed.location as Record<string, unknown>).name,
                      ),
                      address:
                        (typed.location as Record<string, unknown>).address &&
                        typeof (typed.location as Record<string, unknown>)
                          .address === 'object'
                          ? {
                              streetAddress: this.asString(
                                (
                                  (typed.location as Record<string, unknown>)
                                    .address as Record<string, unknown>
                                ).streetAddress,
                              ),
                            }
                          : undefined,
                    }
                  : undefined,
            };
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private extractImageUrl(image?: string | string[]): string | undefined {
    if (typeof image === 'string') return image;
    if (Array.isArray(image) && typeof image[0] === 'string') return image[0];
    return undefined;
  }

  private extractVenueNameFallback(html: string): string {
    const fromHeading = this.extractTagTextAfter(html, '<h1');
    if (fromHeading) return fromHeading;

    const fromGradient = this.extractTagTextAfter(
      html,
      'data-text-fill="true"',
    );
    return fromGradient || '';
  }

  private extractAddressFallback(html: string): string {
    const anchorMatch = html.match(
      /<a[^>]+href=["'][^"']*maps[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
    );
    return this.stripHtml(anchorMatch?.[1] ?? '');
  }

  private extractEventDescriptionFallback(html: string): string {
    const paragraph = this.extractTagTextAfter(html, 'Description Event');
    return paragraph || '';
  }

  private extractAboutVenue(html: string): string {
    return this.extractSectionParagraph(html, 'About Venue') || '';
  }

  private extractMusicStyleTags(html: string): string[] {
    const value = this.extractSectionParagraph(html, 'Music Style');
    if (!value) return [];

    const tags = value
      .split(/,|\/|;|&|\band\b/gi)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 1)
      .slice(0, 3);

    return Array.from(new Set(tags));
  }

  private extractSectionParagraph(html: string, heading: string): string {
    const headingIndex = html.toLowerCase().indexOf(heading.toLowerCase());
    if (headingIndex < 0) return '';

    const sectionWindow = html.slice(headingIndex, headingIndex + 12000);
    const paragraphMatch = sectionWindow.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!paragraphMatch) return '';

    return this.stripHtml(paragraphMatch[1]);
  }

  private extractTagTextAfter(html: string, marker: string): string {
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) return '';

    const window = html.slice(markerIndex, markerIndex + 3000);
    const paragraphMatch = window.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const headingMatch = window.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

    if (paragraphMatch) return this.stripHtml(paragraphMatch[1]);
    if (headingMatch) return this.stripHtml(headingMatch[1]);

    return '';
  }

  private parseAgeLimits(html: string): { male: number; female: number } {
    const cleaned = this.stripHtml(html).replace(/\s+/g, ' ').trim();

    const mixedPattern = /men\s*(\d{1,2})\+\s*[/-]\s*women\s*(\d{1,2})\+/i;
    const mixedMatch = cleaned.match(mixedPattern);
    if (mixedMatch) {
      return {
        male: Number(mixedMatch[1]),
        female: Number(mixedMatch[2]),
      };
    }

    const reversedPattern = /women\s*(\d{1,2})\+\s*[/-]\s*men\s*(\d{1,2})\+/i;
    const reversedMatch = cleaned.match(reversedPattern);
    if (reversedMatch) {
      return {
        male: Number(reversedMatch[2]),
        female: Number(reversedMatch[1]),
      };
    }

    const singleMatch = cleaned.match(/\b(\d{1,2})\+/);
    if (singleMatch) {
      const age = Number(singleMatch[1]);
      return { male: age, female: age };
    }

    return { male: DEFAULT_MIN_AGE, female: DEFAULT_MIN_AGE };
  }

  private async extractCoordinates(html: string): Promise<{
    latitude: number;
    longitude: number;
  }> {
    const mapHrefMatch = html.match(
      /href=["'](https?:\/\/[^"']*maps[^"']*)["']/i,
    );
    if (mapHrefMatch?.[1]) {
      const url = mapHrefMatch[1];

      const directCoordinates = this.extractCoordinatesFromUrl(url);
      if (directCoordinates) {
        return directCoordinates;
      }

      const resolvedUrl = await this.resolveMapsUrl(url);
      if (resolvedUrl) {
        const resolvedCoordinates = this.extractCoordinatesFromUrl(resolvedUrl);
        if (resolvedCoordinates) {
          return resolvedCoordinates;
        }
      }
    }

    return { latitude: BELGRADE_LATITUDE, longitude: BELGRADE_LONGITUDE };
  }

  private extractCoordinatesFromUrl(
    url: string,
  ): { latitude: number; longitude: number } | null {
    const atCoordinates = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atCoordinates) {
      return {
        latitude: Number(atCoordinates[1]),
        longitude: Number(atCoordinates[2]),
      };
    }

    const bangCoordinates = url.match(
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    );
    if (bangCoordinates) {
      return {
        latitude: Number(bangCoordinates[1]),
        longitude: Number(bangCoordinates[2]),
      };
    }

    return null;
  }

  private async resolveMapsUrl(url: string): Promise<string | null> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        await page.goto(url, {
          waitUntil: 'load',
          timeout: 30000,
        });
        return page.url();
      } finally {
        await page.close();
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve maps URL ${url}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }

    return this.browser;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private findBestVenueMatch(
    parsedVenue: ParsedEventDetails,
    existingVenues: ExistingVenue[],
  ): VenueMatchCandidate | null {
    let bestMatch: VenueMatchCandidate | null = null;

    for (const venue of existingVenues) {
      const geoScore = this.calculateGeoSimilarity(
        parsedVenue.latitude,
        parsedVenue.longitude,
        venue.latitude,
        venue.longitude,
      );
      const nameScore = this.calculateTextSimilarity(
        parsedVenue.venueName,
        venue.name,
      );
      const addressScore = this.calculateTextSimilarity(
        parsedVenue.address,
        venue.address ?? '',
      );

      const totalScore =
        geoScore * VENUE_GEO_WEIGHT +
        nameScore * VENUE_NAME_WEIGHT +
        addressScore * VENUE_ADDRESS_WEIGHT;

      if (!bestMatch || totalScore > bestMatch.score) {
        bestMatch = {
          venue,
          score: totalScore,
          geoScore,
          nameScore,
          addressScore,
        };
      }
    }

    if (!bestMatch || bestMatch.score < VENUE_MATCH_THRESHOLD) {
      console.log(
        `'Scrapped venue' "${parsedVenue.venueName}" did not match any existing venue (best score: ${bestMatch?.score.toFixed(1) ?? 'N/A'}%)`,
      );
      return null;
    }

    this.logger.debug(
      `Matched scraped venue "${parsedVenue.venueName}" to existing venue "${bestMatch.venue.name}" with score ${bestMatch.score.toFixed(1)}% (geo ${bestMatch.geoScore.toFixed(1)}%, name ${bestMatch.nameScore.toFixed(1)}%, address ${bestMatch.addressScore.toFixed(1)}%)`,
    );

    return bestMatch;
  }

  private buildVenueKey(name: string, address: string): string {
    return `${this.normalizeText(name)}|${this.normalizeAddress(address)}`;
  }

  private calculateGeoSimilarity(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number | null,
    longitudeB: number | null,
  ): number {
    if (latitudeB == null || longitudeB == null) return 0;

    const latDelta = Math.abs(latitudeA - latitudeB);
    const lngDelta = Math.abs(longitudeA - longitudeB);

    const latScore = Math.max(0, 1 - latDelta / MAX_LATITUDE_DELTA) * 100;
    const lngScore = Math.max(0, 1 - lngDelta / MAX_LONGITUDE_DELTA) * 100;

    return (latScore + lngScore) / 2;
  }

  private calculateTextSimilarity(a: string, b: string): number {
    const normalizedA = this.normalizeText(a);
    const normalizedB = this.normalizeText(b);

    if (!normalizedA || !normalizedB) return 0;
    if (normalizedA === normalizedB) return 100;

    const tokenScore = this.calculateTokenSimilarity(normalizedA, normalizedB);
    const bigramScore = this.calculateBigramSimilarity(
      normalizedA,
      normalizedB,
    );

    const shorter =
      normalizedA.length <= normalizedB.length ? normalizedA : normalizedB;
    const longer =
      normalizedA.length > normalizedB.length ? normalizedA : normalizedB;
    const containmentScore = longer.includes(shorter) ? 100 : 0;

    return tokenScore * 0.45 + bigramScore * 0.45 + containmentScore * 0.1;
  }

  private calculateTokenSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.split(' ').filter(Boolean));
    const tokensB = new Set(b.split(' ').filter(Boolean));
    const union = new Set([...tokensA, ...tokensB]).size;
    if (union === 0) return 0;

    const intersection = Array.from(tokensA).filter((token) =>
      tokensB.has(token),
    ).length;

    return (intersection / union) * 100;
  }

  private calculateBigramSimilarity(a: string, b: string): number {
    const bigramsA = this.toBigrams(a);
    const bigramsB = this.toBigrams(b);
    if (bigramsA.length === 0 || bigramsB.length === 0) return 0;

    const counts = new Map<string, number>();
    for (const gram of bigramsA) {
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }

    let overlap = 0;
    for (const gram of bigramsB) {
      const count = counts.get(gram) ?? 0;
      if (count > 0) {
        overlap += 1;
        counts.set(gram, count - 1);
      }
    }

    return (2 * overlap * 100) / (bigramsA.length + bigramsB.length);
  }

  private toBigrams(value: string): string[] {
    const compact = value.replace(/\s+/g, ' ').trim();
    if (compact.length < 2) return [];

    const grams: string[] = [];
    for (let i = 0; i < compact.length - 1; i += 1) {
      grams.push(compact.slice(i, i + 2));
    }
    return grams;
  }

  private isLikelyDuplicateEvent(args: {
    title: string;
    startDateTime: string;
    venueReference: string;
    events: (Omit<Event, 'id'> & { id?: string })[];
    existingEvents: ExistingEvent[];
  }): boolean {
    const candidateStart = new Date(args.startDateTime);
    const normalizedTitle = this.normalizeText(args.title);

    const inMemoryEvents = args.events
      .filter(
        (event) =>
          event.venue_id === args.venueReference &&
          this.isSameUtcDay(new Date(event.start_date_time), candidateStart),
      )
      .map((event) => ({
        title: event.title,
        start_date_time: event.start_date_time,
      }));

    const allCandidates = [...args.existingEvents, ...inMemoryEvents];

    for (const existingEvent of allCandidates) {
      const eventStart = new Date(existingEvent.start_date_time);
      if (!this.isSameUtcDay(candidateStart, eventStart)) {
        continue;
      }

      const titleScore = this.calculateTextSimilarity(
        normalizedTitle,
        existingEvent.title,
      );
      const hourDelta =
        Math.abs(candidateStart.getTime() - eventStart.getTime()) /
        (60 * 60 * 1000);
      const timeScore =
        Math.max(0, 1 - hourDelta / MAX_EVENT_TIME_DELTA_HOURS) * 100;
      const totalScore =
        titleScore * EVENT_TITLE_WEIGHT + timeScore * EVENT_TIME_WEIGHT;

      if (totalScore >= EVENT_MATCH_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

  private isSameUtcDay(a: Date, b: Date): boolean {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate()
    );
  }

  private normalizeAddress(address: string): string {
    return this.normalizeText(address).replace(/\s+/g, ' ').trim();
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sanitizeString(value: string | undefined): string {
    if (!value) return '';
    return value.split('\u0000').join('').trim();
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
