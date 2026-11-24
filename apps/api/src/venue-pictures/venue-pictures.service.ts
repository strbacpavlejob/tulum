import { ConflictException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import sharp from 'sharp';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  ApifyBudget,
  googleMapsBatch,
  profileBatch,
  remainingUsd,
} from './apify-budget';
import {
  ApifyResult,
  VenuePictureLookupService,
} from './venue-picture-lookup.service';
import {
  findVenueInstagramHandle,
  GoogleMapsPlace,
  InstagramProfile,
  profilePictureUrl,
} from './venue-picture-rules';
import {
  VenuePicturesDataService,
  VenueWithoutPicture,
} from './venue-pictures-data.service';

export type VenuePictureOutcome =
  | 'picture-saved'
  /** Dry run: the picture was found and downloaded, and nothing was saved. */
  | 'picture-found'
  /** The venue got a picture while the run was looking for one. */
  | 'picture-already-set'
  | 'no-instagram-found'
  | 'profile-not-found'
  | 'no-profile-picture'
  | 'download-failed'
  /** The Apify run failed, or stopped before it reached the venue. */
  | 'lookup-failed'
  | 'save-failed';

export interface VenuePictureResult {
  venueId: string;
  name: string;
  instagramHandle: string | null;
  /** Whether this run found the handle on Google Maps. */
  foundOnGoogleMaps: boolean;
  outcome: VenuePictureOutcome;
}

export interface VenuePicturesRun {
  dryRun: boolean;
  venuesWithoutPicture: number;
  /** Venues tried recently, skipped until RETRY_AFTER_HOURS has passed. */
  waitingForRetry: number;
  /** Venues past this run's limits or Apify budget, left for a later run. */
  leftForNextRun: number;
  /** The Apify account's usage when the run started; null if unknown. */
  apifyBudget: ApifyBudget | null;
  searchedOnGoogleMaps: number;
  instagramFoundOnGoogleMaps: number;
  profilesRequested: number;
  /** Pictures saved, or in a dry run found. */
  pictures: number;
  results: VenuePictureResult[];
}

export interface VenuePicturesPreview {
  venuesWithoutPicture: number;
  withInstagram: number;
  withUpcomingEvents: number;
  waitingForRetry: number;
  byScraper: Record<string, number>;
  apifyBudget: ApifyBudget | null;
}

/* Venues per run, unless VENUE_PICTURES_PROFILES_PER_RUN or
 * VENUE_PICTURES_GOOGLE_MAPS_SEARCHES_PER_RUN says otherwise (0 turns that
 * step off). The Apify budget can make a run smaller. */
const DEFAULT_PROFILES_PER_RUN = 200;

const DEFAULT_GOOGLE_MAPS_SEARCHES_PER_RUN = 25;

const MAX_PER_RUN = 1_000;

/* Hours to wait before trying a venue again after each outcome. The job
 * runs every hour, so a failure is not retried at once: each retry is paid
 * for again. */
const RETRY_AFTER_HOURS: Partial<Record<VenuePictureOutcome, number>> = {
  'no-instagram-found': 30 * 24,
  'profile-not-found': 30 * 24,
  'no-profile-picture': 30 * 24,
  'download-failed': 7 * 24,
  'lookup-failed': 6,
  'save-failed': 6,
};

const TRIED_VENUES_KEY = 'venue-pictures:tried';

const TRIED_VENUES_TTL_SECONDS = 60 * 24 * 60 * 60;

const HOUR_MS = 60 * 60 * 1000;

type TriedVenues = Record<
  string,
  { retryAt: string; outcome: VenuePictureOutcome }
>;

/* Venue pictures are 200×200 WebP (docs/images-and-storage.md). */
const PICTURE_SIZE = 200;

const PICTURE_DOWNLOAD_TIMEOUT_MS = 15_000;

const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Fills in the pictures of imported venues that have none, with the venue's
 * Instagram profile picture. A venue without an Instagram handle gets the
 * one its Google Maps listing links to, when the listing is the venue.
 * Only empty pictures are filled; a picture a venue has is never replaced.
 * Apify is only paid within the monthly budget in apify-budget.ts.
 */
@Injectable()
export class VenuePicturesService {
  private readonly logger = new Logger(VenuePicturesService.name);

  private running = false;

  constructor(
    private readonly data: VenuePicturesDataService,
    private readonly lookup: VenuePictureLookupService,
    private readonly r2Service: R2Service,
    private readonly redisService: RedisService,
  ) {}

  /**
   * How many venues lack a picture, and the Apify account's usage. Looks
   * nothing up and changes nothing.
   */
  async previewMissingPictures(): Promise<VenuePicturesPreview> {
    const [venues, upcoming, tried, apifyBudget] = await Promise.all([
      this.data.fetchScrapedVenuesWithoutPicture(),
      this.data.fetchVenueIdsWithUpcomingEvents(),
      this.loadTriedVenues(Date.now()),
      this.lookup.isConfigured() ? this.readBudget() : Promise.resolve(null),
    ]);

    const byScraper: Record<string, number> = {};
    for (const venue of venues) {
      byScraper[venue.scraper] = (byScraper[venue.scraper] ?? 0) + 1;
    }

    return {
      venuesWithoutPicture: venues.length,
      withInstagram: venues.filter((venue) => venue.instagramHandle).length,
      withUpcomingEvents: venues.filter((venue) => upcoming.has(venue.id))
        .length,
      waitingForRetry: venues.filter((venue) => tried[venue.id]).length,
      byScraper,
      apifyBudget,
    };
  }

  /**
   * One run over the venues without a picture. A dry run looks the venues
   * up and downloads their pictures (Apify charges for the lookups), but
   * saves nothing: no picture, no handle, no record of what was tried.
   */
  async fillMissingPictures({
    dryRun = false,
  } = {}): Promise<VenuePicturesRun> {
    if (this.running) {
      throw new ConflictException('Venue pictures are already being filled in');
    }

    this.running = true;
    try {
      return await this.fill(dryRun);
    } finally {
      this.running = false;
    }
  }

  private async fill(dryRun: boolean): Promise<VenuePicturesRun> {
    const now = Date.now();
    const [venues, upcoming, handlesInUse, tried] = await Promise.all([
      this.data.fetchScrapedVenuesWithoutPicture(),
      this.data.fetchVenueIdsWithUpcomingEvents(),
      this.data.fetchInstagramHandlesInUse(),
      this.loadTriedVenues(now),
    ]);

    // Venues with an upcoming event first: guests see those pictures now.
    const due = venues
      .filter((venue) => !tried[venue.id])
      .sort(
        (first, second) =>
          Number(upcoming.has(second.id)) - Number(upcoming.has(first.id)),
      );

    const run: VenuePicturesRun = {
      dryRun,
      venuesWithoutPicture: venues.length,
      waitingForRetry: venues.length - due.length,
      leftForNextRun: due.length,
      apifyBudget: null,
      searchedOnGoogleMaps: 0,
      instagramFoundOnGoogleMaps: 0,
      profilesRequested: 0,
      pictures: 0,
      results: [],
    };

    // Most hourly runs end here, without asking Apify anything.
    if (!due.length) return run;

    if (!this.lookup.isConfigured()) {
      this.logger.warn(
        'APIFY_API_TOKEN is not set, so venue pictures are not looked up',
      );
      return run;
    }

    run.apifyBudget = await this.readBudget();
    if (!run.apifyBudget) return run;

    const handles = new Map<string, string>();
    for (const venue of due) {
      if (venue.instagramHandle) handles.set(venue.id, venue.instagramHandle);
    }

    const foundOnGoogleMaps = await this.findHandlesOnGoogleMaps(
      due.filter((venue) => !venue.instagramHandle),
      {
        dryRun,
        handles,
        handlesInUse,
        run,
        allowanceUsd: remainingUsd(run.apifyBudget),
      },
    );

    // What is left after the Google Maps run, read again from Apify.
    const budget = run.searchedOnGoogleMaps
      ? await this.readBudget()
      : run.apifyBudget;

    // Venues whose handle Google Maps just gave go first, so that a run
    // never pays for a search and leaves its result unused.
    const withHandle = due
      .filter((venue) => handles.has(venue.id))
      .sort(
        (first, second) =>
          Number(foundOnGoogleMaps.has(second.id)) -
          Number(foundOnGoogleMaps.has(first.id)),
      );

    if (budget) {
      await this.storeProfilePictures(withHandle, {
        dryRun,
        handles,
        foundOnGoogleMaps,
        run,
        allowanceUsd: remainingUsd(budget),
      });
    }

    const handled = new Set(run.results.map((result) => result.venueId));
    run.leftForNextRun = due.filter((venue) => !handled.has(venue.id)).length;
    run.pictures = run.results.filter(
      (result) =>
        result.outcome === 'picture-saved' ||
        result.outcome === 'picture-found',
    ).length;

    if (!dryRun) await this.rememberTriedVenues(tried, run.results, now);

    const { usedUsd, ceilingUsd, cycleEndsAt } = run.apifyBudget;
    this.logger.log(
      `${dryRun ? 'Dry run: found' : 'Saved'} ${run.pictures} venue pictures ` +
        `(${run.searchedOnGoogleMaps} Google Maps searches, ${run.profilesRequested} Instagram profiles); ` +
        `${run.leftForNextRun} venues left for a later run, ${run.waitingForRetry} waiting to be tried again. ` +
        `Apify had used $${usedUsd.toFixed(2)} of the $${ceilingUsd.toFixed(2)} the job allows in the cycle ending ${cycleEndsAt}`,
    );

    return run;
  }

  /** The Apify account's usage, or null when Apify can't tell. */
  private async readBudget(): Promise<ApifyBudget | null> {
    try {
      return await this.lookup.readBudget();
    } catch (error) {
      this.logger.error(
        `Couldn't read the Apify account's usage, so nothing is looked up: ${errorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Looks the venues up on Google Maps, as many as the run's limit and
   * allowance let it, and adds the handles found to handles. Returns the
   * ids of the venues that got one.
   */
  private async findHandlesOnGoogleMaps(
    venues: VenueWithoutPicture[],
    context: {
      dryRun: boolean;
      handles: Map<string, string>;
      handlesInUse: Set<string>;
      run: VenuePicturesRun;
      allowanceUsd: number;
    },
  ): Promise<Set<string>> {
    const found = new Set<string>();
    const batch = googleMapsBatch(
      Math.min(
        venues.length,
        perRunLimit(
          'VENUE_PICTURES_GOOGLE_MAPS_SEARCHES_PER_RUN',
          DEFAULT_GOOGLE_MAPS_SEARCHES_PER_RUN,
        ),
      ),
      context.allowanceUsd,
    );
    if (!batch) return found;

    const toSearch = venues.slice(0, batch.size);
    let result: ApifyResult<GoogleMapsPlace[]>;
    try {
      result = await this.lookup.searchGoogleMaps(toSearch, batch.maxChargeUsd);
    } catch (error) {
      this.logger.error(`Google Maps lookup failed: ${errorMessage(error)}`);
      for (const venue of toSearch) {
        context.run.results.push(toResult(venue, null, false, 'lookup-failed'));
      }
      return found;
    }
    context.run.searchedOnGoogleMaps = toSearch.length;

    for (const venue of toSearch) {
      const handle = findVenueInstagramHandle(venue, result.found);
      if (!handle) {
        // A run that stopped early may never have searched for the venue.
        context.run.results.push(
          toResult(
            venue,
            null,
            false,
            result.complete ? 'no-instagram-found' : 'lookup-failed',
          ),
        );
        continue;
      }

      found.add(venue.id);
      context.handles.set(venue.id, handle);
      context.run.instagramFoundOnGoogleMaps += 1;

      if (context.dryRun) continue;

      // A handle another venue has is used for the picture but not saved:
      // two venues with one account are the same place, a duplicate.
      if (context.handlesInUse.has(handle)) {
        this.logger.warn(
          `"${venue.name}": @${handle} from Google Maps is already another venue's, so it isn't saved`,
        );
        continue;
      }

      try {
        await this.data.saveInstagramHandle(venue, handle);
        context.handlesInUse.add(handle);
      } catch (error) {
        this.logger.warn(errorMessage(error));
      }
    }

    return found;
  }

  /**
   * Fetches the venues' Instagram profiles, as many as the run's limit and
   * allowance let it, and stores each profile's picture as its venues'
   * picture.
   */
  private async storeProfilePictures(
    venues: VenueWithoutPicture[],
    context: {
      dryRun: boolean;
      handles: Map<string, string>;
      foundOnGoogleMaps: Set<string>;
      run: VenuePicturesRun;
      allowanceUsd: number;
    },
  ): Promise<void> {
    const wanted = [
      ...new Set(venues.map((venue) => context.handles.get(venue.id)!)),
    ];
    const batch = profileBatch(
      Math.min(
        wanted.length,
        perRunLimit(
          'VENUE_PICTURES_PROFILES_PER_RUN',
          DEFAULT_PROFILES_PER_RUN,
        ),
      ),
      context.allowanceUsd,
    );
    if (!batch) return;

    const handles = wanted.slice(0, batch.size);
    const requested = new Set(handles);
    const batchVenues = venues.filter((venue) =>
      requested.has(context.handles.get(venue.id)!),
    );

    let result: ApifyResult<Map<string, InstagramProfile>>;
    try {
      result = await this.lookup.fetchInstagramProfiles(
        handles,
        batch.maxChargeUsd,
      );
    } catch (error) {
      this.logger.error(
        `Instagram profile lookup failed: ${errorMessage(error)}`,
      );
      for (const venue of batchVenues) {
        context.run.results.push(
          toResult(
            venue,
            context.handles.get(venue.id)!,
            context.foundOnGoogleMaps.has(venue.id),
            'lookup-failed',
          ),
        );
      }
      return;
    }
    context.run.profilesRequested = handles.length;

    // Venues that share an account share its download.
    const downloads = new Map<string, Promise<Buffer | null>>();

    for (const venue of batchVenues) {
      const handle = context.handles.get(venue.id)!;
      const profile = result.found.get(handle);
      // A run that stopped early may never have asked for the profile.
      const outcome =
        !profile && !result.complete
          ? 'lookup-failed'
          : await this.storeProfilePicture(
              venue,
              profile,
              downloads,
              context.dryRun,
            );
      context.run.results.push(
        toResult(
          venue,
          handle,
          context.foundOnGoogleMaps.has(venue.id),
          outcome,
        ),
      );
    }
  }

  private async storeProfilePicture(
    venue: VenueWithoutPicture,
    profile: InstagramProfile | undefined,
    downloads: Map<string, Promise<Buffer | null>>,
    dryRun: boolean,
  ): Promise<VenuePictureOutcome> {
    if (!profile) return 'profile-not-found';

    const sourceUrl = profilePictureUrl(profile);
    if (!sourceUrl) return 'no-profile-picture';

    let download = downloads.get(profile.username);
    if (!download) {
      download = this.downloadPicture(sourceUrl);
      downloads.set(profile.username, download);
    }

    const picture = await download;
    if (!picture) return 'download-failed';
    if (dryRun) return 'picture-found';

    try {
      const pictureUrl = await this.r2Service.uploadAndProcessImage(
        picture,
        `venue-images/scraped/${venue.id}/instagram-profile.webp`,
        PICTURE_SIZE,
        PICTURE_SIZE,
      );
      const saved = await this.data.setPictureIfMissing(venue.id, pictureUrl);
      return saved ? 'picture-saved' : 'picture-already-set';
    } catch (error) {
      this.logger.warn(
        `"${venue.name}": saving its picture failed: ${errorMessage(error)}`,
      );
      return 'save-failed';
    }
  }

  /**
   * The picture at url, when it is one. Instagram's picture URLs are
   * signed and expire within days, so a picture is stored, never linked.
   */
  private async downloadPicture(url: string): Promise<Buffer | null> {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: PICTURE_DOWNLOAD_TIMEOUT_MS,
        maxContentLength: MAX_PICTURE_BYTES,
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        },
      });
      const picture = Buffer.from(response.data);
      // Throws for anything sharp can't read as an image.
      await sharp(picture).metadata();
      return picture;
    } catch (error) {
      this.logger.warn(
        `Downloading ${url.substring(0, 80)} failed: ${errorMessage(error)}`,
      );
      return null;
    }
  }

  /** The venues still waiting to be tried again. */
  private async loadTriedVenues(now: number): Promise<TriedVenues> {
    const stored =
      (await this.redisService.get<TriedVenues>(TRIED_VENUES_KEY)) ?? {};
    return Object.fromEntries(
      Object.entries(stored).filter(
        ([, entry]) => new Date(entry.retryAt).getTime() > now,
      ),
    );
  }

  private async rememberTriedVenues(
    tried: TriedVenues,
    results: VenuePictureResult[],
    now: number,
  ): Promise<void> {
    for (const result of results) {
      const hours = RETRY_AFTER_HOURS[result.outcome];
      if (hours === undefined) continue;
      tried[result.venueId] = {
        retryAt: new Date(now + hours * HOUR_MS).toISOString(),
        outcome: result.outcome,
      };
    }
    await this.redisService.set(
      TRIED_VENUES_KEY,
      tried,
      TRIED_VENUES_TTL_SECONDS,
    );
  }
}

/** An integer setting from 0 to MAX_PER_RUN, or fallback. */
function perRunLimit(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value >= 0 && value <= MAX_PER_RUN
    ? value
    : fallback;
}

function toResult(
  venue: VenueWithoutPicture,
  instagramHandle: string | null,
  foundOnGoogleMaps: boolean,
  outcome: VenuePictureOutcome,
): VenuePictureResult {
  return {
    venueId: venue.id,
    name: venue.name,
    instagramHandle,
    foundOnGoogleMaps,
    outcome,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
