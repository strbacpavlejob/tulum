import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as https from 'https';
import * as puppeteer from 'puppeteer';
import { R2Service } from '../r2/r2.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import { Venue, VenueContact } from '../scrape/interfaces/venue.interface';
import { Event } from '../scrape/interfaces/event.interface';
import { extractEventData } from './instagram-event-extractor';
import { instagramUsernameList } from '../scrape/instagram-username-list';

export interface InstagramVenueProfile {
  username: string;
  fullName: string | null;
  biography: string | null;
  website: string | null;
  phoneNumber: string | null;
  isWhatsappLinked: boolean;
  email: string | null;
  profilePictureUrl: string | null;
  address: string | null;
}

export interface InstagramPost {
  imageUrl: string | null;
  description: string | null;
}

export interface InstagramVenueData {
  profile: InstagramVenueProfile;
  posts: InstagramPost[];
}

const VENUE_USERNAMES: string[] = ['freestylerbelgrade_official'];

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

const INSTAGRAM_POSTS_LIMIT = 5;

/** How long scraped venue data is cached in Redis (6 hours) */
const SCRAPE_CACHE_TTL_SECONDS = 6 * 60 * 60;

@Injectable()
export class InstagramVenueScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(InstagramVenueScraperService.name);
  private browser: puppeteer.Browser | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly r2Service: R2Service,
    private readonly redisService: RedisService,
  ) {}

  async onModuleDestroy() {
    await this.closeBrowser();
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

  /**
   * Scrapes a new venue's full profile (including profile picture upload to R2)
   * and extracts events from its posts. Intended for venues that don't yet exist in DB.
   */
  async scrapeNewVenue(username: string): Promise<{
    venue: Omit<Venue, 'id'>;
    events: (Omit<Event, 'id'> & { id?: string })[];
  }> {
    const data = await this.scrapeVenue(username);
    return this.buildDbObjects(data);
  }

  /**
   * Scrapes only the events from an existing venue's posts (no profile picture upload).
   * Also returns the raw profile picture URL so the caller can optionally update it.
   */
  async scrapeEventsForVenue(username: string): Promise<{
    events: (Omit<Event, 'id'> & { id?: string })[];
    profilePictureUrl: string | null;
  }> {
    const { profile, posts } = await this.scrapeVenue(username);
    const events: (Omit<Event, 'id'> & { id?: string })[] = [];

    for (const post of posts) {
      if (!post.description) continue;

      const extracted = extractEventData(post.description);

      const status: Event['status'] = 'draft';

      const postImageR2 = post.imageUrl
        ? await this.r2Service.downloadAndUpload(
            post.imageUrl,
            `scraped/instagram/${profile.username}/posts/${Date.now()}-${events.length}.webp`,
            { width: 500, height: 375, maxSize: 5 * 1024 * 1024 },
          )
        : null;

      const fallbackDate = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const startDt = extracted.startDateTime ?? fallbackDate;
      events.push({
        venue_id: '0',
        venue_name: profile.fullName ?? profile.username,
        title: extracted.title ?? post.description.substring(0, 80),
        description: post.description,
        start_date_time: startDt,
        end_date_time:
          extracted.endDateTime ?? extracted.startDateTime ?? fallbackDate,
        tags: extracted.tags,
        picture: postImageR2 ?? undefined,
        status,
      });
    }

    return { events, profilePictureUrl: profile.profilePictureUrl };
  }

  async syncInstagramContacts(): Promise<{
    total: number;
    updated: number;
    created: number;
    skipped: number;
    errors: { username: string; reason: string }[];
  }> {
    const allVenues = await this.supabaseService.fetchAllVenues();

    // Build a map from instagram handle → venue id
    const handleToVenueId = new Map<string, string>();
    for (const venue of allVenues) {
      if (!venue.instagram_handle) continue;
      handleToVenueId.set(venue.instagram_handle.toLowerCase(), venue.id);
    }

    const stats = {
      total: 0,
      updated: 0,
      created: 0,
      skipped: 0,
      errors: [] as { username: string; reason: string }[],
    };

    for (const username of instagramUsernameList) {
      stats.total++;
      const venueId = handleToVenueId.get(username.toLowerCase());
      if (!venueId) {
        this.logger.warn(`@${username}: no matching venue in DB — skipping`);
        stats.skipped++;
        stats.errors.push({ username, reason: 'No matching venue in DB' });
        continue;
      }

      try {
        this.logger.log(`@${username}: scraping profile for contact info...`);
        const { profile } = await this.scrapeVenue(username);

        const contact: VenueContact | null = profile.phoneNumber
          ? {
              phone_number: profile.phoneNumber,
              is_phone: true,
              is_viber: false,
              is_sms: false,
              is_whatsapp: profile.isWhatsappLinked,
              is_instagram: true,
              instagram_handle: profile.username ?? null,
            }
          : profile.username
            ? {
                phone_number: '',
                is_phone: false,
                is_viber: false,
                is_sms: false,
                is_whatsapp: profile.isWhatsappLinked,
                is_instagram: true,
                instagram_handle: profile.username,
              }
            : null;

        if (!contact) {
          this.logger.warn(`@${username}: no contact info found — skipping`);
          stats.skipped++;
          continue;
        }

        const wasNew = await this.supabaseService.upsertVenueContactById(
          venueId,
          contact,
        );
        if (wasNew) {
          stats.created++;
          this.logger.log(`@${username}: contact created`);
        } else {
          stats.updated++;
          this.logger.log(`@${username}: contact updated`);
        }
      } catch (err) {
        const reason = (err as Error).message;
        this.logger.error(`@${username}: failed — ${reason}`);
        stats.errors.push({ username, reason });
        stats.skipped++;
      }
    }

    return stats;
  }

  async scrapeAllVenues(): Promise<{
    scraped: number;
    saved: { venues: number; events: number };
  }> {
    const allVenues: Omit<Venue, 'id'>[] = [];
    const allEvents: (Omit<Event, 'id'> & { id?: string })[] = [];

    for (const username of VENUE_USERNAMES) {
      try {
        this.logger.log(`Scraping Instagram profile: @${username}`);
        const data = await this.scrapeVenue(username);
        const { venue, events } = await this.buildDbObjects(data);
        allVenues.push(venue);
        allEvents.push(...events);
        this.logger.log(
          `@${username}: extracted ${events.length} events (${events.filter((e) => e.start_date_time).length} with dates)`,
        );
      } catch (err) {
        this.logger.error(`Failed to scrape @${username}:`, err);
      }
    }

    const saved = await this.supabaseService.saveScrapedData({
      venues: allVenues,
      events: allEvents,
    });

    return { scraped: allVenues.length, saved };
  }

  private async buildDbObjects(data: InstagramVenueData): Promise<{
    venue: Omit<Venue, 'id'>;
    events: (Omit<Event, 'id'> & { id?: string })[];
  }> {
    const { profile, posts } = data;
    const venueName = profile.fullName ?? profile.username;

    const rawAddress = profile.address ?? null;
    const streetAddress = rawAddress
      ? this.stripVenueNameFromAddress(rawAddress)
      : venueName;
    const { latitude, longitude } = await this.geocodeAddress(streetAddress);
    this.logger.log(
      `Geocoded "${streetAddress}, Belgrade": lat=${latitude}, lon=${longitude}`,
    );

    // Mirror profile picture to R2
    const profilePicR2 = profile.profilePictureUrl
      ? await this.r2Service.downloadAndUpload(
          profile.profilePictureUrl,
          `scraped/instagram/${profile.username}/profile.webp`,
        )
      : null;

    const venue: Omit<Venue, 'id'> = {
      host_id: process.env.DEFAULT_VENUE_HOST_ID ?? 'user_test',
      name: venueName,
      longitude,
      latitude,
      type: 'nightclub',
      capacity: 100,
      address: streetAddress,
      description: profile.biography ?? undefined,
      picture: profilePicR2 ?? undefined,
      picture_urls: profilePicR2 ? [profilePicR2] : [],
      contact: profile.phoneNumber
        ? {
            phone_number: profile.phoneNumber,
            is_phone: true,
            is_viber: false,
            is_sms: false,
            is_whatsapp: profile.isWhatsappLinked,
            is_instagram: true,
            instagram_handle: profile.username ?? null,
          }
        : profile.username
          ? {
              phone_number: '',
              is_phone: false,
              is_viber: false,
              is_sms: false,
              is_whatsapp: profile.isWhatsappLinked,
              is_instagram: true,
              instagram_handle: profile.username,
            }
          : null,
      scraper: 'instagram',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const events: (Omit<Event, 'id'> & { id?: string })[] = [];

    for (const post of posts) {
      if (!post.description) continue;

      const extracted = extractEventData(post.description);

      const status: Event['status'] = 'draft';

      // Mirror post image to R2
      const postImageR2 = post.imageUrl
        ? await this.r2Service.downloadAndUpload(
            post.imageUrl,
            `scraped/instagram/${profile.username}/posts/${Date.now()}-${events.length}.webp`,
            { width: 500, height: 375, maxSize: 5 * 1024 * 1024 },
          )
        : null;

      const fallbackDate = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const startDt = extracted.startDateTime ?? fallbackDate;
      events.push({
        venue_id: '0', // resolved by saveScrapedData via venue_name
        venue_name: venueName,
        title: extracted.title ?? post.description.substring(0, 80),
        description: post.description,
        start_date_time: startDt,
        end_date_time:
          extracted.endDateTime ?? extracted.startDateTime ?? fallbackDate,
        tags: extracted.tags,
        picture: postImageR2 ?? undefined,
        status,
      });
    }

    return { venue, events };
  }

  async scrapeVenue(username: string): Promise<InstagramVenueData> {
    const cacheKey = `instagram:venue:${username}`;
    const cached = await this.redisService.get<InstagramVenueData>(cacheKey);
    if (cached) {
      this.logger.log(`[Cache HIT] @${username}: using cached Instagram data`);
      return cached;
    }
    this.logger.log(
      `[Cache MISS] @${username}: scraping from storiesig.info...`,
    );

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      );
      await page.setViewport({ width: 1280, height: 800 });

      // Set up response interceptors before navigation
      let resolveUserInfo!: (data: unknown) => void;
      let resolvePostsV2!: (data: unknown) => void;

      const userInfoPromise = new Promise<unknown>((resolve) => {
        resolveUserInfo = resolve;
      });
      const postsV2Promise = new Promise<unknown>((resolve) => {
        resolvePostsV2 = resolve;
      });

      page.on('response', (response) => {
        const url = response.url();
        const isPost = response.request().method() === 'POST';
        const isOk = response.status() === 200;

        if (
          isPost &&
          isOk &&
          url.includes('api-wh.storiesig.info/api/v1/instagram/userInfo')
        ) {
          response
            .json()
            .then((data) => resolveUserInfo(data))
            .catch(() => resolveUserInfo(null));
        }

        if (
          isPost &&
          isOk &&
          url.includes('api-wh.storiesig.info/api/v1/instagram/postsV2')
        ) {
          response
            .json()
            .then((data) => resolvePostsV2(data))
            .catch(() => resolvePostsV2(null));
        }
      });

      // Navigate to storiesig
      await page.goto('https://storiesig.info/en/', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Type username into search input
      await page.waitForSelector('input.search-form__input', {
        timeout: 10000,
      });
      await page.type('input.search-form__input', username);

      // Click search button
      await page.click('button.search-form__button');

      // Wait for both API responses with 30s timeout.
      // Each resolves to null on timeout rather than rejecting, so a slow
      // postsV2 response doesn't cancel a successful userInfo and vice-versa.
      const withTimeout = <T>(
        promise: Promise<T>,
        ms: number,
      ): Promise<T | null> =>
        Promise.race([
          promise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
        ]);

      const [userInfoRaw, postsV2Raw] = await Promise.all([
        withTimeout(userInfoPromise, 60000),
        withTimeout(postsV2Promise, 60000),
      ]);

      if (userInfoRaw === null && postsV2Raw === null) {
        throw new Error('Timed out waiting for response after 60000ms');
      }

      const profile = this.parseUserInfo(username, userInfoRaw);
      const posts = this.parsePostsV2(postsV2Raw).slice(
        0,
        INSTAGRAM_POSTS_LIMIT,
      );

      const result: InstagramVenueData = { profile, posts };
      await this.redisService.set(cacheKey, result, SCRAPE_CACHE_TTL_SECONDS);
      this.logger.log(
        `[Cache SET] @${username}: data cached for ${SCRAPE_CACHE_TTL_SECONDS}s`,
      );
      return result;
    } finally {
      await page.close();
    }
  }

  private parseUserInfo(username: string, raw: unknown): InstagramVenueProfile {
    try {
      const data = raw as {
        result?: Array<{ user?: Record<string, unknown> }>;
      };
      const user = data?.result?.[0]?.user as
        | Record<string, unknown>
        | undefined;

      if (!user) {
        this.logger.warn(`No user data in userInfo response for @${username}`);
        return this.emptyProfile(username);
      }

      const bioLinks = user.bio_links as Array<{ url?: string }> | undefined;
      const website =
        (user.external_url as string | undefined) ?? bioLinks?.[0]?.url ?? null;

      const hdPicUrl = (
        user.hd_profile_pic_url_info as Record<string, unknown> | undefined
      )?.url as string | undefined;

      return {
        username,
        fullName: (user.full_name as string) ?? null,
        biography: (user.biography as string) ?? null,
        website: website ?? null,
        phoneNumber: (user.contact_phone_number as string) ?? null,
        isWhatsappLinked: (user.is_whatsapp_linked as boolean) === true,
        email: (user.public_email as string) ?? null,
        profilePictureUrl: hdPicUrl ?? (user.profile_pic_url as string) ?? null,
        address: (user.address_street as string) ?? null,
      };
    } catch (err) {
      this.logger.error(`Failed to parse userInfo for @${username}:`, err);
      return this.emptyProfile(username);
    }
  }

  private parsePostsV2(raw: unknown): InstagramPost[] {
    try {
      const data = raw as {
        result?: {
          edges?: Array<{
            node?: {
              display_url?: string;
              taken_at_timestamp?: number;
              edge_media_to_caption?: {
                edges?: Array<{ node?: { text?: string } }>;
              };
            };
          }>;
        };
      };

      const edges = data?.result?.edges ?? [];
      const cutoff = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago in ms

      return edges
        .filter((edge) => {
          const ts = edge.node?.taken_at_timestamp;
          if (!ts) return true; // no timestamp — don't skip
          return ts * 1000 >= cutoff;
        })
        .map((edge) => {
          const node = edge.node;
          const imageUrl = node?.display_url ?? null;
          const description =
            node?.edge_media_to_caption?.edges?.[0]?.node?.text ?? null;
          return { imageUrl, description };
        });
    } catch (err) {
      this.logger.error('Failed to parse postsV2:', err);
      return [];
    }
  }

  private stripVenueNameFromAddress(address: string): string {
    const commaIndex = address.indexOf(',');
    if (commaIndex !== -1) {
      const street = address.substring(commaIndex + 1).trim();
      if (street.length > 0) {
        return street;
      }
    }
    return address;
  }

  private async geocodeAddress(
    address: string,
  ): Promise<{ latitude: number; longitude: number }> {
    const query = encodeURIComponent(`${address}, Belgrade, Serbia`);
    const url = `${NOMINATIM_ENDPOINT}?q=${query}&format=json&limit=1`;

    return new Promise((resolve) => {
      const req = https.get(
        url,
        { headers: { 'User-Agent': 'tulum-api/1.0 (venue scraper)' } },
        (res) => {
          let body = '';
          res.on('data', (chunk: Buffer) => (body += chunk.toString()));
          res.on('end', () => {
            try {
              const results = JSON.parse(body) as Array<{
                lat?: string;
                lon?: string;
              }>;
              if (results.length > 0 && results[0].lat && results[0].lon) {
                resolve({
                  latitude: parseFloat(results[0].lat),
                  longitude: parseFloat(results[0].lon),
                });
              } else {
                resolve({ latitude: 0, longitude: 0 });
              }
            } catch {
              resolve({ latitude: 0, longitude: 0 });
            }
          });
        },
      );
      req.on('error', () => resolve({ latitude: 0, longitude: 0 }));
      req.end();
    });
  }

  private emptyProfile(username: string): InstagramVenueProfile {
    return {
      username,
      fullName: null,
      biography: null,
      website: null,
      phoneNumber: null,
      isWhatsappLinked: false,
      email: null,
      profilePictureUrl: null,
      address: null,
    };
  }
}
