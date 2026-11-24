import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApifyClient } from 'apify-client';
import { ApifyBudget, usageCeilingUsd } from './apify-budget';
import {
  GoogleMapsPlace,
  InstagramProfile,
  VenueLocation,
} from './venue-picture-rules';

const INSTAGRAM_PROFILE_ACTOR = 'apify/instagram-profile-scraper';

const GOOGLE_MAPS_ACTOR = 'compass/crawler-google-places';

/* A venue's search returns the venue first; the next ones are neighbours. */
const GOOGLE_MAPS_PLACES_PER_SEARCH = 3;

/* Seconds a run may take before Apify stops it. */
const INSTAGRAM_RUN_TIMEOUT_SECONDS = 10 * 60;

const GOOGLE_MAPS_RUN_TIMEOUT_SECONDS = 15 * 60;

/* Zoom 17 frames a few blocks around the venue, where Google ranks first. */
const GOOGLE_MAPS_SEARCH_ZOOM = 17;

export interface ApifyResult<T> {
  found: T;
  /**
   * Whether the run finished. A run stopped by its timeout or cost cap
   * keeps what it found before that, and says nothing about the rest.
   */
  complete: boolean;
}

/**
 * Looks venues up through Apify: Instagram profiles by handle, and the
 * Google Maps places around a venue that have its name, with the Instagram
 * profiles their websites link to. Each run is capped at the charge its
 * caller allows (see apify-budget.ts).
 */
@Injectable()
export class VenuePictureLookupService {
  private readonly logger = new Logger(VenuePictureLookupService.name);

  private readonly client: ApifyClient | null;

  constructor(configService: ConfigService) {
    const token = configService.get<string>('APIFY_API_TOKEN');
    this.client = token ? new ApifyClient({ token }) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * What the Apify account has used in its billing cycle, and how far the
   * job lets it go. Reading it costs nothing.
   */
  async readBudget(): Promise<ApifyBudget> {
    if (!this.client) {
      throw new Error('APIFY_API_TOKEN is not set');
    }

    const account = await this.client.user().limits();
    if (!account) {
      throw new Error('Apify returned no usage for the account');
    }

    return {
      usedUsd: account.current.monthlyUsageUsd,
      ceilingUsd: usageCeilingUsd(account.limits.maxMonthlyUsageUsd),
      cycleEndsAt: new Date(account.monthlyUsageCycle.endAt).toISOString(),
    };
  }

  /** The public profiles of these handles, by lowercase handle. */
  async fetchInstagramProfiles(
    handles: string[],
    maxChargeUsd: number,
  ): Promise<ApifyResult<Map<string, InstagramProfile>>> {
    const profiles = new Map<string, InstagramProfile>();
    if (!handles.length) return { found: profiles, complete: true };

    const { items, complete } = await this.runActor(
      INSTAGRAM_PROFILE_ACTOR,
      { usernames: handles },
      {
        timeout: INSTAGRAM_RUN_TIMEOUT_SECONDS,
        maxTotalChargeUsd: maxChargeUsd,
      },
    );

    for (const item of items) {
      const profile = toInstagramProfile(item);
      if (profile) profiles.set(profile.username, profile);
    }

    this.logger.log(
      `Apify returned ${profiles.size} of ${handles.length} Instagram profiles`,
    );
    return { found: profiles, complete };
  }

  /**
   * The places Google Maps finds for each venue's name around its
   * position, with the Instagram profiles linked from their websites.
   */
  async searchGoogleMaps(
    venues: VenueLocation[],
    maxChargeUsd: number,
  ): Promise<ApifyResult<GoogleMapsPlace[]>> {
    if (!venues.length) return { found: [], complete: true };

    const { items, complete } = await this.runActor(
      GOOGLE_MAPS_ACTOR,
      {
        startUrls: venues.map((venue) => ({ url: googleMapsSearchUrl(venue) })),
        maxCrawledPlacesPerSearch: GOOGLE_MAPS_PLACES_PER_SEARCH,
        language: 'en',
        // Reads each place's website for its contacts, Instagram included.
        scrapeContacts: true,
      },
      {
        timeout: GOOGLE_MAPS_RUN_TIMEOUT_SECONDS,
        maxTotalChargeUsd: maxChargeUsd,
      },
    );

    const places = items
      .map((item) => toGoogleMapsPlace(item))
      .filter((place): place is GoogleMapsPlace => place !== null);

    this.logger.log(
      `Apify found ${places.length} Google Maps places for ${venues.length} venues`,
    );
    return { found: places, complete };
  }

  private async runActor(
    actorId: string,
    input: Record<string, unknown>,
    options: { timeout: number; maxTotalChargeUsd: number },
  ): Promise<{ items: Record<string | number, unknown>[]; complete: boolean }> {
    if (!this.client) {
      throw new Error('APIFY_API_TOKEN is not set');
    }

    const run = await this.client
      .actor(actorId)
      .call(input, { ...options, log: null });

    const complete = run.status === 'SUCCEEDED';
    if (!complete) {
      this.logger.warn(`Apify run ${run.id} of ${actorId} ended ${run.status}`);
    }

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();
    return { items, complete };
  }
}

export function googleMapsSearchUrl(venue: VenueLocation): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(venue.name)}/@${venue.latitude},${venue.longitude},${GOOGLE_MAPS_SEARCH_ZOOM}z`;
}

function toInstagramProfile(
  item: Record<string | number, unknown>,
): InstagramProfile | null {
  // The actor doesn't document how it reports a handle it can't find, so
  // an item without a username, or with an error, counts as not found.
  if (typeof item.username !== 'string' || item.error) return null;

  return {
    username: item.username.toLowerCase(),
    fullName: optionalString(item.fullName),
    profilePicUrl: optionalString(item.profilePicUrl),
    profilePicUrlHD: optionalString(item.profilePicUrlHD),
  };
}

function toGoogleMapsPlace(
  item: Record<string | number, unknown>,
): GoogleMapsPlace | null {
  if (typeof item.title !== 'string' || !item.title) return null;

  const location = (item.location ?? {}) as { lat?: unknown; lng?: unknown };

  return {
    title: item.title,
    latitude: typeof location.lat === 'number' ? location.lat : null,
    longitude: typeof location.lng === 'number' ? location.lng : null,
    website: optionalString(item.website),
    instagramUrls: Array.isArray(item.instagrams)
      ? item.instagrams.filter((url): url is string => typeof url === 'string')
      : [],
    permanentlyClosed: item.permanentlyClosed === true,
  };
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}
