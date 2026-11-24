import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { downloadPicture, PictureDownload } from '../common/download-picture';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  ExternalPicture,
  ExternalPicturesDataService,
  PictureTable,
} from './external-pictures-data.service';

export type ExternalPictureOutcome =
  | 'stored'
  /** Dry run: the picture was downloaded, and nothing was saved. */
  | 'downloaded'
  /** The download failed; the next run tries again. */
  | 'download-failed'
  /**
   * The picture is gone (404 or 410) or failed to download for
   * GIVE_UP_AFTER_HOURS, so the row's picture_url was cleared.
   */
  | 'removed'
  /** The row's picture changed, or the row went, during the run. */
  | 'row-changed'
  | 'save-failed';

export interface ExternalPictureResult {
  table: PictureTable;
  id: string;
  sourceUrl: string;
  outcome: ExternalPictureOutcome;
  error?: string;
}

export interface ExternalPicturesRun {
  dryRun: boolean;
  /** Events and venues whose picture was on another site. */
  external: number;
  /** Past this run's limit, left for the next run. */
  leftForNextRun: number;
  stored: number;
  removed: number;
  failed: number;
  results: ExternalPictureResult[];
}

export interface ExternalPicturesPreview {
  events: number;
  upcomingEvents: number;
  venues: number;
  /** The pictures by the site they are on. */
  byHost: Record<string, number>;
  /** Pictures whose downloads have failed and are being tried again. */
  failing: number;
}

/* Pictures per run; the rest wait for the next one. */
const PICTURES_PER_RUN = 200;

/* As a host's uploads: events 500×375, venues 200×200, WebP
 * (docs/images-and-storage.md). */
const PICTURE_SIZES: Record<PictureTable, { width: number; height: number }> = {
  events: { width: 500, height: 375 },
  venues: { width: 200, height: 200 },
};

/* A picture that keeps failing to download is cleared after this long. */
const GIVE_UP_AFTER_HOURS = 24;

const FAILING_KEY = 'external-pictures:failing';

const FAILING_TTL_SECONDS = 7 * 24 * 60 * 60;

const HOUR_MS = 60 * 60 * 1000;

/* Rows whose downloads failed, by `<table>:<id>`, since when. */
type FailingPictures = Record<string, { sourceUrl: string; since: string }>;

/**
 * Stores in R2 the pictures of events and venues that point at another
 * site, which scrapers save as the source gives them: Instagram's picture
 * URLs expire, and other sites can change or drop theirs. Each picture is
 * downloaded, resized to WebP and stored under the row's own key, and the
 * row then points at R2. A picture that is gone is cleared instead, so the
 * event shows its venue's picture.
 */
@Injectable()
export class ExternalPicturesService {
  private readonly logger = new Logger(ExternalPicturesService.name);

  private running = false;

  constructor(
    private readonly data: ExternalPicturesDataService,
    private readonly r2Service: R2Service,
    private readonly redisService: RedisService,
  ) {}

  /** Counts the pictures still on other sites. Changes nothing. */
  async previewExternalPictures(): Promise<ExternalPicturesPreview> {
    const [pictures, failing] = await Promise.all([
      this.fetchExternalPictures(),
      this.loadFailing(),
    ]);

    const byHost: Record<string, number> = {};
    for (const picture of pictures) {
      const host = hostOf(picture.pictureUrl);
      byHost[host] = (byHost[host] ?? 0) + 1;
    }

    const events = pictures.filter((picture) => picture.table === 'events');
    return {
      events: events.length,
      upcomingEvents: events.filter((picture) => picture.upcoming).length,
      venues: pictures.length - events.length,
      byHost,
      failing: pictures.filter(
        (picture) =>
          failing[failingKey(picture)]?.sourceUrl === picture.pictureUrl,
      ).length,
    };
  }

  /**
   * One run over the pictures on other sites. A dry run downloads them and
   * saves nothing.
   */
  async storeExternalPictures({
    dryRun = false,
  } = {}): Promise<ExternalPicturesRun> {
    if (this.running) {
      throw new ConflictException('External pictures are already being stored');
    }

    this.running = true;
    try {
      return await this.store(dryRun);
    } finally {
      this.running = false;
    }
  }

  private async store(dryRun: boolean): Promise<ExternalPicturesRun> {
    const run: ExternalPicturesRun = {
      dryRun,
      external: 0,
      leftForNextRun: 0,
      stored: 0,
      removed: 0,
      failed: 0,
      results: [],
    };

    if (!this.r2Service.isConfigured()) {
      this.logger.warn('R2 is not configured, so pictures are not stored');
      return run;
    }

    const pictures = await this.fetchExternalPictures();
    run.external = pictures.length;
    // Most runs end here.
    if (!pictures.length) return run;

    // Venues first, as their pictures stand in for their events', then
    // events guests can still go to.
    const batch = [
      ...pictures.filter((picture) => picture.table === 'venues'),
      ...pictures.filter((picture) => picture.upcoming),
      ...pictures.filter(
        (picture) => picture.table === 'events' && !picture.upcoming,
      ),
    ].slice(0, PICTURES_PER_RUN);
    run.leftForNextRun = pictures.length - batch.length;

    const now = Date.now();
    const failing = await this.loadFailing();
    // Forget rows that have since been stored, given another picture or gone.
    const stillExternal = new Set(pictures.map(failingKey));
    for (const key of Object.keys(failing)) {
      if (!stillExternal.has(key)) delete failing[key];
    }
    // Rows that share a picture share its download.
    const downloads = new Map<string, Promise<PictureDownload>>();

    for (const picture of batch) {
      let download = downloads.get(picture.pictureUrl);
      if (!download) {
        download = downloadPicture(picture.pictureUrl);
        downloads.set(picture.pictureUrl, download);
      }

      const result = await this.storePicture(
        picture,
        await download,
        failing,
        now,
        dryRun,
      );
      run.results.push(result);
      if (result.outcome === 'stored') run.stored += 1;
      else if (result.outcome === 'removed') run.removed += 1;
      else if (
        result.outcome === 'download-failed' ||
        result.outcome === 'save-failed'
      ) {
        run.failed += 1;
      }
    }

    if (!dryRun) await this.saveFailing(failing);

    this.logger.log(
      `${dryRun ? 'Dry run: ' : ''}${pictures.length} pictures on other sites; ` +
        `stored ${run.stored}, cleared ${run.removed}, failed ${run.failed}, ` +
        `${run.leftForNextRun} left for the next run`,
    );
    return run;
  }

  private async storePicture(
    picture: ExternalPicture,
    download: PictureDownload,
    failing: FailingPictures,
    now: number,
    dryRun: boolean,
  ): Promise<ExternalPictureResult> {
    const result = (
      outcome: ExternalPictureOutcome,
      error?: string,
    ): ExternalPictureResult => ({
      table: picture.table,
      id: picture.id,
      sourceUrl: picture.pictureUrl,
      outcome,
      ...(error ? { error } : {}),
    });
    const key = failingKey(picture);

    if ('error' in download) {
      const earlier = failing[key];
      const since =
        earlier?.sourceUrl === picture.pictureUrl
          ? Date.parse(earlier.since)
          : now;
      const givingUp =
        download.gone || now - since >= GIVE_UP_AFTER_HOURS * HOUR_MS;

      if (dryRun) return result('download-failed', download.error);
      if (!givingUp) {
        failing[key] = {
          sourceUrl: picture.pictureUrl,
          since: new Date(since).toISOString(),
        };
        this.logger.warn(
          `Downloading the picture of ${picture.table} ${picture.id} failed: ${download.error}`,
        );
        return result('download-failed', download.error);
      }

      try {
        const cleared = await this.data.replacePicture(
          picture.table,
          picture.id,
          picture.pictureUrl,
          null,
        );
        delete failing[key];
        return result(cleared ? 'removed' : 'row-changed', download.error);
      } catch (error) {
        return result('save-failed', errorMessage(error));
      }
    }

    delete failing[key];
    if (dryRun) return result('downloaded');

    const objectKey = storedPictureKey(picture);
    const { width, height } = PICTURE_SIZES[picture.table];
    try {
      const storedUrl = await this.r2Service.uploadAndProcessImage(
        download.picture,
        objectKey,
        width,
        height,
      );
      const saved = await this.data.replacePicture(
        picture.table,
        picture.id,
        picture.pictureUrl,
        storedUrl,
      );
      if (saved) return result('stored');

      // Unless another run stored the same picture, nothing uses it now.
      const current = await this.data.currentPicture(picture.table, picture.id);
      if (current !== storedUrl) await this.r2Service.deleteObject(objectKey);
      return result('row-changed');
    } catch (error) {
      this.logger.warn(
        `Storing the picture of ${picture.table} ${picture.id} failed: ${errorMessage(error)}`,
      );
      return result('save-failed', errorMessage(error));
    }
  }

  /** The rows whose picture is on another site, not in the bucket. */
  private async fetchExternalPictures(): Promise<ExternalPicture[]> {
    const pictures = await this.data.fetchExternalPictures(
      this.r2Service.publicBaseUrl,
    );
    // A URL on an earlier address of the bucket (R2_LEGACY_PUBLIC_URLS) is
    // already stored.
    return pictures.filter(
      (picture) =>
        this.r2Service.extractKeyFromUrl(picture.pictureUrl) === null,
    );
  }

  private async loadFailing(): Promise<FailingPictures> {
    return (await this.redisService.get<FailingPictures>(FAILING_KEY)) ?? {};
  }

  private async saveFailing(failing: FailingPictures): Promise<void> {
    if (Object.keys(failing).length) {
      await this.redisService.set(FAILING_KEY, failing, FAILING_TTL_SECONDS);
    } else {
      await this.redisService.del(FAILING_KEY);
    }
  }
}

/** Where a row's picture is stored; the row's own key, so a retry overwrites it. */
function storedPictureKey(picture: ExternalPicture): string {
  return picture.table === 'events'
    ? `event-images/scraped/${picture.id}/picture.webp`
    : `venue-images/scraped/${picture.id}/picture.webp`;
}

function failingKey(picture: ExternalPicture): string {
  return `${picture.table}:${picture.id}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'not a URL';
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
