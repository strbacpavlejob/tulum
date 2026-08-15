import { HttpService } from '@nestjs/axios';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as puppeteer from 'puppeteer';
import { isValid, parseISO } from 'date-fns';
import { GeocoderService } from 'src/geocoder/geocoder.service';
import {
  ImageStoragePolicy,
  SCRAPER_CONFIGS,
  ScraperConfig,
  ScraperSource,
} from '../../domain/scraper-config';
import {
  ScrapedEvent,
  ScrapedVenue,
  Scraper,
  ScraperResult,
} from '../../domain/scraper.interface';
import { VenueTypeEnum } from '../../domain/scraper-venue.interfaces';
import {
  asString,
  buildVenueTypeMap,
  createEventDateRange,
  getHttpStatus,
  isRetryableHttpError,
  normalizeText,
  sanitizeScrapedText,
  sanitizeString,
  withRetry,
} from '../../shared/scraper.helpers';
import { ScraperLogs } from '../../shared/scraper-logs';
import { ConfigService } from '@nestjs/config/dist/config.service';

interface ParsedEventDetails {
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
}

interface EventJsonLd {
  name?: string;
  startDate?: string;
  description?: string;
  image?: string | string[];
  location?: {
    name?: string;
    address?: { streetAddress?: string };
  };
}

const PAGE_TIMEOUT_MS = 30_000;
const LOAD_MORE_TIMEOUT_MS = 7_000;
const MAX_LOAD_MORE_ITERATIONS = 30;
const EVENT_LINK_SELECTOR = 'a[href*="/events/"]';

@Injectable()
export class GuestListSerbiaScraperService
  implements
    OnModuleDestroy,
    Scraper<
      [ParsedEventDetails, VenueTypeEnum, string?],
      [ParsedEventDetails, string, ScrapedVenue]
    >
{
  readonly config: ScraperConfig = SCRAPER_CONFIGS[ScraperSource.GUEST_LIST];

  private readonly logs = new ScraperLogs(
    GuestListSerbiaScraperService.name,
    this.config.source,
  );

  private browser: puppeteer.Browser | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly geoCoder: GeocoderService,
    private readonly configService: ConfigService,
  ) {
    const baseConfig = SCRAPER_CONFIGS[ScraperSource.GUEST_LIST];

    this.config = {
      ...baseConfig,
      venues: {
        ...baseConfig.venues,
        defaultHostId: this.configService.getOrThrow<string>(
          'DEFAULT_VENUE_HOST_ID',
        ),
      },
    };
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
  }

  mapVenue(
    parsed: ParsedEventDetails,
    venueType: VenueTypeEnum,
    venueName = parsed.venueName,
  ): ScrapedVenue {
    const now = new Date();
    const defaultAges = this.config.venues.defaultAgeRestriction;

    return {
      hostId: this.config.venues.defaultHostId ?? 'DEFAULT_VENUE_HOST_ID',
      venueType,
      name: venueName,
      longitude: parsed.longitude,
      latitude: parsed.latitude,
      address: parsed.address,
      description: parsed.venueDescription || parsed.description,
      capacity: this.config.venues.defaultCapacity,
      pictureUrl: this.resolveImageUrl(
        parsed.imageUrl,
        this.config.venues.imagePolicy,
      ),
      scraper: this.config.source,
      contact: null,
      requiresReservation: false,
      minAgeMale: this.config.venues.hasAgeRestriction
        ? parsed.minAgeMale
        : (defaultAges?.male ?? 0),
      minAgeFemale: this.config.venues.hasAgeRestriction
        ? parsed.minAgeFemale
        : (defaultAges?.female ?? 0),
      createdAt: now,
      updatedAt: now,
    };
  }

  mapEvent(
    parsed: ParsedEventDetails,
    venueId: string,
    venue: ScrapedVenue,
  ): ScrapedEvent {
    const { startDate, endDate } = createEventDateRange(
      parsed.startDateTime,
      this.config.events.defaultDurationHour,
    );
    const now = new Date();

    return {
      venue,
      venueId,
      title: parsed.title,
      description: parsed.description,
      startDateTime: startDate,
      endDateTime: endDate,
      tags: parsed.tags.slice(0, 3),
      pictureUrl: this.resolveImageUrl(
        parsed.imageUrl,
        this.config.events.imagePolicy,
      ),
      status: this.config.events.defaultStatus,
      scraper: this.config.source,
      createdAt: now,
      updatedAt: now,
    };
  }

  async scrape(): Promise<ScraperResult> {
    const venuesByKey = new Map<string, ScrapedVenue>();
    const events: ScrapedEvent[] = [];

    for (const [category, venueType] of buildVenueTypeMap(
      this.config.venues.venueTypeMapping,
    )) {
      const url = new URL(this.config.baseUrl);
      url.searchParams.set('venue-type-2', category);

      this.logs.categoryScrapingStarted(category, venueType);

      const eventPaths = await this.fetchEventPaths(url.toString());

      for (const eventPath of eventPaths) {
        await this.scrapeEvent(eventPath, venueType, venuesByKey, events);
      }

      this.logs.categoryScrapingCompleted(
        category,
        venueType,
        eventPaths.length,
      );
    }

    const venues = [...venuesByKey.values()];
    this.logs.transformationCompleted(venues, events);
    this.logs.scrapeCompleted(venues.length, events.length);

    return { venues, events };
  }

  private async scrapeEvent(
    eventPath: string,
    venueType: VenueTypeEnum,
    venuesByKey: Map<string, ScrapedVenue>,
    events: ScrapedEvent[],
  ): Promise<void> {
    const eventUrl = new URL(eventPath, this.config.baseUrl).toString();
    const parsed = await this.parseEventDetails(await this.fetchHtml(eventUrl));

    if (!parsed || !isValid(parseISO(parsed.startDateTime))) {
      return;
    }

    const venueKey = `${normalizeText(parsed.venueName)}|${normalizeText(
      parsed.address,
    )}`;
    const venue = venuesByKey.get(venueKey);

    if (!venue) {
      venuesByKey.set(venueKey, this.mapVenue(parsed, venueType));
    } else {
      const defaults = this.config.venues.defaultAgeRestriction;

      if (this.config.venues.hasAgeRestriction) {
        venue.minAgeMale = Math.max(
          venue.minAgeMale ?? defaults?.male ?? 0,
          parsed.minAgeMale,
        );
        venue.minAgeFemale = Math.max(
          venue.minAgeFemale ?? defaults?.female ?? 0,
          parsed.minAgeFemale,
        );
      }

      venue.description ||= parsed.venueDescription;

      if (
        !venue.pictureUrl &&
        this.config.venues.imagePolicy !== ImageStoragePolicy.KEEP_EMPTY
      ) {
        venue.pictureUrl = parsed.imageUrl ?? null;
      }

      venue.updatedAt = new Date();
    }

    events.push(this.mapEvent(parsed, venueKey, venuesByKey.get(venueKey)!));
  }

  private fetchHtml(url: string): Promise<string> {
    return withRetry(
      async () => {
        const response = await firstValueFrom(
          this.httpService.get<string>(url, {
            responseType: 'text',
            timeout: PAGE_TIMEOUT_MS,
          }),
        );

        if (typeof response.data !== 'string') {
          throw new Error(`Expected HTML string response for ${url}`);
        }

        return response.data;
      },
      {
        retries: 3,
        delayMs: this.config.events.fetchDelay ?? 0,
        shouldRetry: isRetryableHttpError,
        onRetry: ({ error, attempt, retries, waitMs }) =>
          this.logs.requestRetry({
            attempt,
            retries,
            waitMs,
            status: getHttpStatus(error),
          }),
      },
    );
  }

  private async fetchEventPaths(url: string): Promise<string[]> {
    let page: puppeteer.Page | undefined;

    try {
      page = await (await this.getBrowser()).newPage();

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: PAGE_TIMEOUT_MS,
      });

      let previousCount = await page.$$eval(
        EVENT_LINK_SELECTOR,
        (links) => links.length,
      );

      this.logs.warning(`Initial event count for ${url}: ${previousCount}`);

      for (
        let iteration = 0;
        iteration < MAX_LOAD_MORE_ITERATIONS;
        iteration += 1
      ) {
        const buttons = await page.$$('button[data-framer-name="Default"]');

        let loadMoreButton: puppeteer.ElementHandle<HTMLButtonElement> | null =
          null;

        for (const button of buttons) {
          const text = await button.evaluate((element) =>
            element.textContent?.replace(/\s+/g, ' ').trim().toLowerCase(),
          );

          if (text === 'load more') {
            loadMoreButton = button;
            break;
          }
        }

        if (!loadMoreButton) {
          this.logs.warning(
            `Load More button no longer found after ${iteration} iterations`,
          );
          break;
        }

        await loadMoreButton.evaluate((element) => {
          element.scrollIntoView({
            block: 'center',
            inline: 'center',
          });
        });

        await new Promise((resolve) => setTimeout(resolve, 300));

        await loadMoreButton.click();

        try {
          await page.waitForFunction(
            (selector, count) =>
              document.querySelectorAll(selector).length > count,
            {
              timeout: LOAD_MORE_TIMEOUT_MS,
            },
            EVENT_LINK_SELECTOR,
            previousCount,
          );
        } catch {
          this.logs.warning(
            `Load More clicked but event count did not increase within ${LOAD_MORE_TIMEOUT_MS}ms`,
          );
        }

        const currentCount = await page.$$eval(
          EVENT_LINK_SELECTOR,
          (links) => links.length,
        );

        this.logs.warning(
          `Load More iteration ${iteration + 1}: ${previousCount} -> ${currentCount}`,
        );

        if (currentCount <= previousCount) {
          this.logs.warning(`No new events loaded after clicking Load More`);
          break;
        }

        previousCount = currentCount;
      }

      const eventPaths = await page.$$eval(EVENT_LINK_SELECTOR, (links) => [
        ...new Set(
          links
            .map((link) => link.getAttribute('href'))
            .filter((href): href is string => Boolean(href)),
        ),
      ]);

      this.logs.warning(
        `Finished loading ${url}: ${eventPaths.length} unique events`,
      );

      return eventPaths;
    } catch (error: unknown) {
      this.logs.warning(
        `Failed to load list page with Load More for ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return this.extractEventPaths(await this.fetchHtml(url));
    } finally {
      await page?.close();
    }
  }
  private extractEventPaths(html: string): string[] {
    const paths = new Set<string>();

    for (const match of html.matchAll(
      /href=["'](\.?\/events\/[^"'#?\s]+)["']/gi,
    )) {
      const pathname = new URL(match[1], this.config.baseUrl).pathname;
      if (pathname.startsWith('/events/')) paths.add(pathname);
    }

    return [...paths];
  }

  private async parseEventDetails(
    html: string,
  ): Promise<ParsedEventDetails | null> {
    const jsonLd = this.extractEventJsonLd(html);
    if (!jsonLd) return null;

    const title = sanitizeString(jsonLd.name);
    const startDateTime = sanitizeString(jsonLd.startDate);
    const venueName =
      sanitizeString(jsonLd.location?.name) ||
      this.extractTextAfter(html, '<h1') ||
      this.extractTextAfter(html, 'data-text-fill="true"');
    const address =
      sanitizeString(jsonLd.location?.address?.streetAddress) ||
      sanitizeScrapedText(
        html.match(
          /<a[^>]+href=["'][^"']*maps[^"']*["'][^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
        )?.[1],
      );

    if (!title || !startDateTime || !venueName || !address) return null;

    const description =
      sanitizeString(jsonLd.description) ||
      this.extractTextAfter(html, 'Description Event');
    const venueDescription =
      this.extractSectionParagraph(html, 'About Venue') || description;
    const musicStyles = this.extractSectionParagraph(html, 'Music Style');
    const { latitude, longitude } =
      await this.geoCoder.extractCoordinates(html);
    const { male, female } = this.parseAgeLimits(html);

    return {
      title,
      description,
      startDateTime,
      venueName,
      address,
      venueDescription,
      tags: [
        ...new Set(
          musicStyles
            .split(/,|\/|;|&|\band\b/gi)
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 1),
        ),
      ].slice(0, 3),
      imageUrl:
        typeof jsonLd.image === 'string' ? jsonLd.image : jsonLd.image?.[0],
      latitude,
      longitude,
      minAgeMale: male,
      minAgeFemale: female,
    };
  }

  private extractEventJsonLd(html: string): EventJsonLd | null {
    const scripts = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );

    for (const match of scripts) {
      try {
        const parsed: unknown = JSON.parse(match[1]);
        const candidates = Array.isArray(parsed) ? parsed : [parsed];

        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== 'object') continue;

          const value = candidate as Record<string, unknown>;
          const type = value['@type'];
          if (
            typeof type !== 'string' ||
            !type.toLowerCase().includes('event')
          ) {
            continue;
          }

          const location =
            value.location && typeof value.location === 'object'
              ? (value.location as Record<string, unknown>)
              : undefined;
          const address =
            location?.address && typeof location.address === 'object'
              ? (location.address as Record<string, unknown>)
              : undefined;

          return {
            name: asString(value.name),
            startDate: asString(value.startDate),
            description: asString(value.description),
            image:
              typeof value.image === 'string' || Array.isArray(value.image)
                ? (value.image as string | string[])
                : undefined,
            location: location
              ? {
                  name: asString(location.name),
                  address: address
                    ? { streetAddress: asString(address.streetAddress) }
                    : undefined,
                }
              : undefined,
          };
        }
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    }

    return null;
  }

  private extractSectionParagraph(html: string, heading: string): string {
    const index = html.toLowerCase().indexOf(heading.toLowerCase());
    if (index < 0) return '';

    return sanitizeScrapedText(
      html.slice(index, index + 12_000).match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1],
    );
  }

  private extractTextAfter(html: string, marker: string): string {
    const index = html.indexOf(marker);
    if (index < 0) return '';

    const section = html.slice(index, index + 3_000);
    return sanitizeScrapedText(
      section.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
        section.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1],
    );
  }

  private parseAgeLimits(html: string): { male: number; female: number } {
    const defaults = {
      male: this.config.venues.defaultAgeRestriction?.male ?? 0,
      female: this.config.venues.defaultAgeRestriction?.female ?? 0,
    };

    if (!this.config.venues.hasAgeRestriction) return defaults;

    const text = sanitizeScrapedText(html);
    const menFirst = text.match(
      /men\s*(\d{1,2})\+\s*[/-]\s*women\s*(\d{1,2})\+/i,
    );
    if (menFirst) {
      return { male: Number(menFirst[1]), female: Number(menFirst[2]) };
    }

    const womenFirst = text.match(
      /women\s*(\d{1,2})\+\s*[/-]\s*men\s*(\d{1,2})\+/i,
    );
    if (womenFirst) {
      return { male: Number(womenFirst[2]), female: Number(womenFirst[1]) };
    }

    const sharedAge = text.match(/\b(\d{1,2})\+/)?.[1];
    return sharedAge
      ? { male: Number(sharedAge), female: Number(sharedAge) }
      : defaults;
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    this.browser ??= await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    return this.browser;
  }

  private resolveImageUrl(
    imageUrl: string | undefined,
    policy: ImageStoragePolicy,
  ): string | null {
    return policy === ImageStoragePolicy.KEEP_EMPTY ? null : (imageUrl ?? null);
  }
}
