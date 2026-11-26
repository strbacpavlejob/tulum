import { Injectable, Logger } from '@nestjs/common';
import { downloadPicture } from '../common/download-picture';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  CarouselSlide,
  InstagramGraphService,
  PublishResult,
} from './instagram-graph.service';
import {
  buildCaption,
  EventGroup,
  formatDateRange,
  GROUP_ORDER,
  maxSlides,
  MIN_EVENTS_PER_POST,
  parseSchedule,
  pickEvents,
  PostEvent,
  PostKind,
  PostSchedule,
  postWindow,
  PostWindow,
} from './instagram-post-rules';
import { InstagramPostsDataService } from './instagram-posts-data.service';
import { renderSlide, Slide, VENUE_TAG_POSITION } from './instagram-slides';

export type InstagramPostOutcome =
  | 'published'
  /** Dry run: the slides were drawn and stored to look at; nothing went out. */
  | 'previewed'
  /** Today's post of this kind went out already, or may have. */
  | 'already-published'
  /** Another run is publishing it now. */
  | 'in-progress'
  | 'not-enough-events'
  | 'nothing-scheduled'
  /** INSTAGRAM_ACCESS_TOKEN or R2 isn't set up. */
  | 'not-configured'
  | 'failed'
  /** media_publish got no clear answer: look at the account before posting again. */
  | 'unknown';

export interface PlannedEvent {
  id: string;
  title: string;
  venue: string;
  group: EventGroup;
  startsAt: string;
  guestCount: number;
  instagramHandle: string | null;
}

export interface InstagramPostRun {
  /** The post's day, Belgrade time. */
  date: string;
  kind: PostKind | null;
  dryRun: boolean;
  outcome: InstagramPostOutcome;
  events: PlannedEvent[];
  caption: string | null;
  /** A dry run's slides, to look at. */
  slideUrls: string[];
  mediaId?: string;
  permalink?: string | null;
  error?: string;
}

export interface InstagramPostPlan {
  date: string;
  kind: PostKind | null;
  /** The post on each weekday, from INSTAGRAM_POSTS_SCHEDULE or the default. */
  schedule: Record<string, PostKind>;
  configured: { instagram: boolean; r2: boolean };
  events: PlannedEvent[];
  caption: string | null;
  /** Today's post of this kind, when one went out or is going out. */
  record: PostRecord | null;
}

/** What happened to a day's post, so that no later run posts it again. */
export interface PostRecord {
  status: 'publishing' | 'published' | 'unknown';
  at: string;
  mediaId?: string;
  permalink?: string | null;
  error?: string;
}

interface EventWithPicture {
  event: PostEvent;
  picture: Buffer;
}

/* A slide to draw, and the venue tagged on it. */
interface SlideToStore {
  slide: Slide;
  venueHandle: string | null;
}

const RECORD_KEY_PREFIX = 'instagram-posts:published';

/* A run's claim on the day's post. If the process dies while publishing, the
 * claim runs out before the next hourly run, which tries again. */
const CLAIM_TTL_SECONDS = 50 * 60;

/* A post's record outlives its week. */
const RECORD_TTL_SECONDS = 8 * 24 * 60 * 60;

/* Slides stay in R2 only while Instagram fetches them; a dry run's stay
 * until the next dry run. */
const SLIDES_FOLDER = 'instagram-posts/';
const PREVIEW_FOLDER = 'instagram-posts/preview/';

/* How many times events whose picture won't download are swapped for
 * others. */
const PICTURE_ROUNDS = 3;

const WEEKDAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * The weekly Instagram posts: picks the week's events for a post, draws its
 * slides, stores them in R2 for Instagram to fetch, and publishes them as a
 * carousel. A day's post goes out once, however many runs try.
 */
@Injectable()
export class InstagramPostsService {
  private readonly logger = new Logger(InstagramPostsService.name);

  constructor(
    private readonly data: InstagramPostsDataService,
    private readonly graph: InstagramGraphService,
    private readonly r2Service: R2Service,
    private readonly redisService: RedisService,
  ) {}

  /** Today's scheduled post, unless it went out already: the cron's run. */
  async publishScheduledPost(now = new Date()): Promise<InstagramPostRun> {
    const window = postWindow(now);
    const kind = this.schedule().byWeekday.get(window.weekday) ?? null;
    if (!kind) return emptyRun(window, null, 'nothing-scheduled');
    if (!this.graph.isConfigured()) {
      return emptyRun(window, kind, 'not-configured');
    }
    return this.publish(kind, { now });
  }

  /**
   * What a post of kind (by default today's) would show today, and what
   * happened to today's. Draws nothing and changes nothing.
   */
  async plan(kind?: PostKind, now = new Date()): Promise<InstagramPostPlan> {
    const window = postWindow(now);
    const schedule = this.schedule();
    const planned = kind ?? schedule.byWeekday.get(window.weekday) ?? null;
    const events = planned
      ? pickEvents(await this.candidates(window), planned, maxEventsPerPost())
      : [];

    return {
      date: window.date,
      kind: planned,
      schedule: Object.fromEntries(
        [...schedule.byWeekday].map(([day, post]) => [
          WEEKDAY_NAMES[day],
          post,
        ]),
      ),
      configured: {
        instagram: this.graph.isConfigured(),
        r2: this.r2Service.isConfigured(),
      },
      events: events.map(plannedEvent),
      caption:
        planned && events.length >= MIN_EVENTS_PER_POST
          ? buildCaption(planned, events, window)
          : null,
      record: planned
        ? await this.redisService.get<PostRecord>(
            recordKey(window.date, planned),
          )
        : null,
    };
  }

  /**
   * Draws a post of kind and publishes it now. With dryRun the slides are
   * stored in R2 to look at, and nothing goes out.
   */
  async publish(
    kind: PostKind,
    { dryRun = false, now = new Date() }: { dryRun?: boolean; now?: Date } = {},
  ): Promise<InstagramPostRun> {
    const window = postWindow(now);
    const run: InstagramPostRun = {
      date: window.date,
      kind,
      dryRun,
      outcome: 'not-configured',
      events: [],
      caption: null,
      slideUrls: [],
    };
    if (!this.r2Service.isConfigured()) {
      return { ...run, outcome: 'not-configured', error: 'R2 is not set up' };
    }
    if (!dryRun && !this.graph.isConfigured()) {
      return {
        ...run,
        outcome: 'not-configured',
        error: 'INSTAGRAM_ACCESS_TOKEN is not set',
      };
    }

    const key = recordKey(window.date, kind);
    if (!dryRun) {
      // The runs after the day's post stop here, before any work.
      const record = await this.redisService.get<PostRecord>(key);
      if (record) return recordedRun(run, record);
    }

    const post = await this.pickWithPictures(kind, window);
    run.events = post.map(({ event }) => plannedEvent(event));
    if (post.length < MIN_EVENTS_PER_POST) {
      this.logger.log(
        `Instagram ${kind} post for ${window.date}: ${post.length} events, too few to post`,
      );
      return { ...run, outcome: 'not-enough-events' };
    }
    const caption = buildCaption(
      kind,
      post.map(({ event }) => event),
      window,
    );
    run.caption = caption;

    if (dryRun) {
      await this.deleteSlides(PREVIEW_FOLDER);
      const slides = await this.storeSlides(
        `${PREVIEW_FOLDER}${runFolder(window, kind)}/`,
        kind,
        post,
        window,
      );
      return {
        ...run,
        outcome: 'previewed',
        slideUrls: slides.map((slide) => slide.imageUrl),
      };
    }

    const claim: PostRecord = { status: 'publishing', at: now.toISOString() };
    const claimed = await this.redisService.setIfAbsent(
      key,
      claim,
      CLAIM_TTL_SECONDS,
    );
    if (claimed === null) {
      // Without the record, a later run could post it a second time.
      return {
        ...run,
        outcome: 'failed',
        error: "Redis didn't answer, so nothing was posted",
      };
    }
    if (!claimed) {
      // Another run claimed it since the check above.
      return recordedRun(run, await this.redisService.get<PostRecord>(key));
    }

    await this.graph.renewTokenIfDue(now);
    const folder = `${SLIDES_FOLDER}${runFolder(window, kind)}/`;
    let result: PublishResult;
    try {
      const slides = await this.storeSlides(folder, kind, post, window);
      result = await this.graph.publishCarousel(slides, caption);
    } catch (error) {
      result = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      // Instagram keeps its own copies once the containers are ready.
      await this.deleteSlides(folder);
    }
    return this.record(key, run, result);
  }

  /* Keeps what happened to the day's post, and returns the run. */
  private async record(
    key: string,
    run: InstagramPostRun,
    result: PublishResult,
  ): Promise<InstagramPostRun> {
    const at = new Date().toISOString();
    const post = `Instagram ${run.kind} post for ${run.date}`;

    if (result.status === 'published') {
      const record: PostRecord = {
        status: 'published',
        at,
        mediaId: result.mediaId,
        permalink: result.permalink,
      };
      await this.redisService.set(key, record, RECORD_TTL_SECONDS);
      this.logger.log(
        `${post} published: ${result.permalink ?? result.mediaId}`,
      );
      return {
        ...run,
        outcome: 'published',
        mediaId: result.mediaId,
        permalink: result.permalink,
      };
    }

    if (result.status === 'unknown') {
      // Kept, so that no run posts it twice before someone has looked.
      const record: PostRecord = { status: 'unknown', at, error: result.error };
      await this.redisService.set(key, record, RECORD_TTL_SECONDS);
      this.logger.error(
        `${post} may have gone out: ${result.error}. Check the account; deleting Redis key ${key} lets it post again.`,
      );
      return { ...run, outcome: 'unknown', error: result.error };
    }

    await this.redisService.del(key);
    this.logger.error(`${post} failed: ${result.error}`);
    return { ...run, outcome: 'failed', error: result.error };
  }

  /* The week's events with a picture stored in R2. */
  private async candidates(window: PostWindow): Promise<PostEvent[]> {
    const events = await this.data.fetchEvents(window.from, window.until);
    return events.filter(
      (event) => this.r2Service.extractKeyFromUrl(event.pictureUrl) !== null,
    );
  }

  /* The post's events with their pictures. An event whose picture won't
   * download is swapped for the next pick. */
  private async pickWithPictures(
    kind: PostKind,
    window: PostWindow,
  ): Promise<EventWithPicture[]> {
    let candidates = await this.candidates(window);
    for (let round = 1; ; round++) {
      const events = pickEvents(candidates, kind, maxEventsPerPost());
      const downloads = await Promise.all(
        events.map((event) => downloadPicture(event.pictureUrl)),
      );
      const withPictures = events.flatMap((event, i): EventWithPicture[] => {
        const download = downloads[i];
        return 'picture' in download
          ? [{ event, picture: download.picture }]
          : [];
      });
      if (withPictures.length === events.length || round === PICTURE_ROUNDS) {
        return withPictures;
      }

      const failed = new Set<string>();
      events.forEach((event, i) => {
        const download = downloads[i];
        if ('error' in download) {
          failed.add(event.id);
          this.logger.warn(
            `Instagram post: event ${event.id}'s picture didn't download (${download.error}); picking another`,
          );
        }
      });
      candidates = candidates.filter((event) => !failed.has(event.id));
    }
  }

  /* Draws the post's slides and stores them in R2 under folder. */
  private async storeSlides(
    folder: string,
    kind: PostKind,
    post: EventWithPicture[],
    window: PostWindow,
  ): Promise<CarouselSlide[]> {
    const slides: SlideToStore[] = [
      {
        slide: {
          type: 'cover',
          kind,
          dateRange: formatDateRange(window),
          eventCount: post.length,
          groups: GROUP_ORDER.filter((group) =>
            post.some(({ event }) => event.group === group),
          ),
        },
        venueHandle: null,
      },
      ...post.map(
        ({ event, picture }): SlideToStore => ({
          slide: { type: 'event', event, picture },
          venueHandle: event.instagramHandle,
        }),
      ),
      { slide: { type: 'closing' }, venueHandle: null },
    ];

    const stored: CarouselSlide[] = [];
    for (const [index, { slide, venueHandle }] of slides.entries()) {
      const jpeg = await renderSlide(slide, {
        number: index + 1,
        total: slides.length,
      });
      const imageUrl = await this.r2Service.uploadBuffer(
        `${folder}${String(index + 1).padStart(2, '0')}.jpg`,
        jpeg,
        'image/jpeg',
      );
      stored.push({
        imageUrl,
        userTags: venueHandle
          ? [{ username: venueHandle, ...VENUE_TAG_POSITION }]
          : [],
      });
    }
    return stored;
  }

  private async deleteSlides(folder: string): Promise<void> {
    try {
      await this.r2Service.deleteFolder(folder);
    } catch (error) {
      this.logger.warn(
        `Couldn't delete the Instagram slides in ${folder}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private schedule(): PostSchedule {
    const schedule = parseSchedule(process.env.INSTAGRAM_POSTS_SCHEDULE);
    if (schedule.invalid.length > 0) {
      this.logger.warn(
        `INSTAGRAM_POSTS_SCHEDULE: left out ${schedule.invalid.join(', ')}`,
      );
    }
    return schedule;
  }
}

/* The events a post can show: its slides less the cover and closing one. */
function maxEventsPerPost(): number {
  return maxSlides(process.env.INSTAGRAM_POSTS_MAX_SLIDES) - 2;
}

function recordKey(date: string, kind: PostKind): string {
  return `${RECORD_KEY_PREFIX}:${date}:${kind}`;
}

/* A run's own folder: Cloudflare caches a stored file for a day, so a run
 * that tries again never gets the slides an earlier run drew. */
function runFolder(window: PostWindow, kind: PostKind): string {
  return `${window.date}-${kind}-${Date.now().toString(36)}`;
}

/* A run that found the day's post recorded: published, maybe published, or
 * being published by another run. */
function recordedRun(
  run: InstagramPostRun,
  record: PostRecord | null,
): InstagramPostRun {
  return {
    ...run,
    outcome:
      record?.status === 'publishing' ? 'in-progress' : 'already-published',
    mediaId: record?.mediaId,
    permalink: record?.permalink,
    error: record?.error,
  };
}

function plannedEvent(event: PostEvent): PlannedEvent {
  return {
    id: event.id,
    title: event.title,
    venue: event.venueName,
    group: event.group,
    startsAt: event.startsAt,
    guestCount: event.guestCount,
    instagramHandle: event.instagramHandle,
  };
}

function emptyRun(
  window: PostWindow,
  kind: PostKind | null,
  outcome: InstagramPostOutcome,
): InstagramPostRun {
  return {
    date: window.date,
    kind,
    dryRun: false,
    outcome,
    events: [],
    caption: null,
    slideUrls: [],
  };
}
