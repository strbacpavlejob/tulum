import { Injectable, Logger } from '@nestjs/common';
import { downloadPicture } from '../common/download-picture';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import {
  InstagramGraphService,
  PublishResult,
} from './instagram-graph.service';
import {
  byStart,
  EventGroup,
  PostEvent,
  withoutPromoted,
} from './instagram-post-rules';
import { InstagramPostsDataService } from './instagram-posts-data.service';
import { renderStory } from './instagram-slides';
import {
  dueSlot,
  hasStoryTitle,
  nextSlot,
  parseStorySchedule,
  pickStoryEvents,
  retryAt,
  storyCount,
  storyDay,
  StoryEventRange,
  storyEventRange,
  StorySchedule,
  StorySlot,
  storyWindow,
  storyWindowHours,
} from './instagram-story-rules';
import {
  Publication,
  PublicationHistoryMissingError,
  PublicationHistoryService,
} from './publication-history.service';

export type InstagramStoryOutcome =
  /** At least one story went out. */
  | 'published'
  /** Dry run: the stories were drawn and stored to look at. */
  | 'previewed'
  /** No event can have a story: none is coming up, or all are promoted. */
  | 'nothing-to-publish'
  /** The slot's run is done, or may be. */
  | 'already-done'
  /** Another run is publishing now. */
  | 'in-progress'
  /** A failed slot waits for its next try. */
  | 'waiting'
  /** INSTAGRAM_ACCESS_TOKEN, R2 or the history table isn't set up. */
  | 'not-configured'
  | 'failed'
  /** media_publish got no clear answer: look at the account. */
  | 'unknown';

export interface StoryResult {
  eventId: string;
  title: string;
  venue: string;
  group: EventGroup;
  startsAt: string;
  /** "Tonight", "Tomorrow", "Saturday", as the story says. */
  day: string;
  status: PublishResult['status'] | 'previewed' | 'skipped';
  mediaId?: string;
  permalink?: string | null;
  /** A dry run's story, to look at. */
  imageUrl?: string;
  error?: string;
}

export interface InstagramStoryRun {
  /** The slot ("2026-11-27T10:00"), or "manual". */
  slot: string;
  dryRun: boolean;
  outcome: InstagramStoryOutcome;
  /** Events that could have had a story. */
  eligible: number;
  stories: StoryResult[];
  /** The slot's tries so far, failed ones included. */
  attempts?: number;
  /** When a failed slot is tried again. */
  retryAt?: string;
  error?: string;
}

/** What happened to a slot, so that no later tick runs it again. */
export interface StorySlotRecord {
  status: 'done' | 'retrying';
  outcome: InstagramStoryOutcome;
  at: string;
  attempts: number;
  retryAt?: string;
  stories: { eventId: string; mediaId?: string; permalink?: string | null }[];
  error?: string;
}

export interface PlannedStoryEvent {
  id: string;
  title: string;
  venue: string;
  group: EventGroup;
  startsAt: string;
  day: string;
}

export interface InstagramStoryPlan {
  /** Belgrade times, from INSTAGRAM_STORIES_SCHEDULE or the default. */
  schedule: string[];
  windowHours: number;
  events: StoryEventRange;
  configured: { instagram: boolean; r2: boolean; history: boolean };
  /** The slot running now, if one is, and its record. */
  dueSlot: { slot: string; record: StorySlotRecord | null } | null;
  nextSlot: string | null;
  /** The events a run now could show. */
  eligible: PlannedStoryEvent[];
  /** A random pick from them, as a run now might make. */
  samplePick: PlannedStoryEvent[];
  /** The last day's stories, newest first. */
  recentStories: {
    eventId: string;
    title: string;
    status: string;
    at: string;
  }[];
  error?: string;
}

interface Candidates {
  eligible: PostEvent[];
  recent: Publication[];
  recentVenueIds: Set<string>;
}

interface EventWithPicture {
  event: PostEvent;
  picture: Buffer;
}

/* One run publishes at a time, scheduled or not. A run takes a few minutes;
 * if the process dies, the lock runs out. */
const LOCK_KEY = 'instagram-stories:lock';
const LOCK_TTL_SECONDS = 20 * 60;

const SLOT_KEY_PREFIX = 'instagram-stories:slot';

/* A done slot's record outlives its day; a failed one's lasts until its
 * tries are over. */
const DONE_TTL_SECONDS = 3 * 24 * 60 * 60;
const RETRYING_TTL_SECONDS = 2 * 60 * 60;

/* The last day's stories steer the picks to other venues. */
const RECENT_STORIES_MS = 24 * 60 * 60 * 1000;

/* How many times events whose picture won't download, or that another run
 * took, are swapped for other picks. */
const PICK_ROUNDS = 3;

/* Pictures stay in R2 only while Instagram fetches them; a dry run's stay
 * until the next dry run. */
const STORIES_FOLDER = 'instagram-stories/';
const PREVIEW_FOLDER = 'instagram-stories/preview/';

/**
 * Instagram Stories of the next two days' events, three times a day: picks
 * two or three events at random, draws a 9:16 story for each, stores it in
 * R2 for Instagram to fetch, and publishes it. An event is promoted once:
 * the history it shares with the weekly posts records it before its story
 * goes out, and marks it published once Instagram confirms. Rules and
 * settings are in docs/instagram-posts.md.
 */
@Injectable()
export class InstagramStoriesService {
  private readonly logger = new Logger(InstagramStoriesService.name);

  /* The picks' chance; the specs replace it. */
  private random: () => number = Math.random;

  constructor(
    private readonly data: InstagramPostsDataService,
    private readonly history: PublicationHistoryService,
    private readonly graph: InstagramGraphService,
    private readonly r2Service: R2Service,
    private readonly redisService: RedisService,
  ) {}

  /**
   * The cron's run: publishes the due slot's stories, unless the slot is
   * done or waiting for its next try. Null when no slot is due.
   */
  async publishDueStories(now = new Date()): Promise<InstagramStoryRun | null> {
    const slot = dueSlot(now, this.schedule().times);
    if (!slot) return null;

    const key = slotKey(slot);
    const recorded = await this.redisService.get<StorySlotRecord>(key);
    const settled = settledOutcome(recorded, now);
    if (settled) return recordedRun(slot.key, settled, recorded);

    return this.withLock(slot.key, now, async () => {
      // Another run may have finished the slot since the check above.
      const latest = await this.redisService.get<StorySlotRecord>(key);
      const outcome = settledOutcome(latest, now);
      if (outcome) return recordedRun(slot.key, outcome, latest);

      const attempts = (latest?.attempts ?? 0) + 1;
      const run = await this.runSlot(slot, now);
      return this.recordSlot(slot, key, run, attempts, now);
    });
  }

  /**
   * Publishes a run's stories now, outside the schedule. With dryRun they
   * are drawn and stored in R2 to look at, and nothing goes out. No event
   * is promoted twice either way.
   */
  async publish({
    dryRun = false,
    now = new Date(),
  }: { dryRun?: boolean; now?: Date } = {}): Promise<InstagramStoryRun> {
    const notReady = this.missingSetup(dryRun);
    if (notReady) {
      return {
        ...emptyRun('manual', 'not-configured', dryRun),
        error: notReady,
      };
    }
    if (dryRun) return this.run('manual', now, { dryRun: true });
    return this.withLock('manual', now, () => this.run('manual', now));
  }

  /** The schedule, the due slot and the events a run now could show. */
  async plan(now = new Date()): Promise<InstagramStoryPlan> {
    const schedule = this.schedule();
    const slot = dueSlot(now, schedule.times);
    const plan: InstagramStoryPlan = {
      schedule: schedule.times,
      windowHours: windowHours(),
      events: eventRange(),
      configured: {
        instagram: this.graph.isConfigured(),
        r2: this.r2Service.isConfigured(),
        history: true,
      },
      dueSlot: slot
        ? {
            slot: slot.key,
            record: await this.redisService.get<StorySlotRecord>(slotKey(slot)),
          }
        : null,
      nextSlot: nextSlot(now, schedule.times)?.key ?? null,
      eligible: [],
      samplePick: [],
      recentStories: [],
    };

    try {
      const { eligible, recent, recentVenueIds } = await this.candidates(now);
      const pick = pickStoryEvents(
        eligible,
        storyCount(eventRange(), this.random),
        { recentVenueIds, random: this.random },
      );
      return {
        ...plan,
        eligible: eligible.map((event) => plannedEvent(event, now)),
        samplePick: pick.map((event) => plannedEvent(event, now)),
        recentStories: recent.map((story) => ({
          eventId: story.eventId,
          title: story.title,
          status: story.status,
          at: story.createdAt,
        })),
      };
    } catch (error) {
      const missing = error instanceof PublicationHistoryMissingError;
      return {
        ...plan,
        configured: { ...plan.configured, history: !missing },
        error: message(error),
      };
    }
  }

  /* A slot's run, unless the history shows one of its runs got as far as
   * claiming events: the slot's record can be lost, the history can't. */
  private async runSlot(
    slot: StorySlot,
    now: Date,
  ): Promise<InstagramStoryRun> {
    const notReady = this.missingSetup(false);
    if (notReady) {
      this.log('warn', 'not-configured', { slot: slot.key, error: notReady });
      return { ...emptyRun(slot.key, 'not-configured'), error: notReady };
    }
    try {
      if (await this.history.hasRun(`story:${slot.key}:`)) {
        return emptyRun(slot.key, 'already-done');
      }
    } catch (error) {
      return this.notPublished(slot.key, error);
    }
    return this.run(slot.key, now);
  }

  /* Picks the events, claims them, and publishes a story for each. */
  private async run(
    slot: string,
    now: Date,
    { dryRun = false }: { dryRun?: boolean } = {},
  ): Promise<InstagramStoryRun> {
    const id = runId();
    const runKey = `story:${slot}:${id}`;
    const run = emptyRun(slot, 'failed', dryRun);

    let candidates: Candidates;
    try {
      candidates = await this.candidates(now);
    } catch (error) {
      // Without the history, a story could repeat an event.
      return this.notPublished(slot, error);
    }
    run.eligible = candidates.eligible.length;
    if (run.eligible === 0) {
      this.log('log', 'nothing-to-publish', { slot });
      return { ...run, outcome: 'nothing-to-publish' };
    }

    let chosen: EventWithPicture[];
    try {
      chosen = await this.pickAndClaim(candidates, runKey, dryRun);
    } catch (error) {
      return this.notPublished(slot, error);
    }
    if (chosen.length === 0) {
      this.log('warn', 'nothing-to-publish', {
        slot,
        eligible: run.eligible,
        reason: "the picks' pictures didn't download, or other runs took them",
      });
      return { ...run, outcome: 'nothing-to-publish' };
    }

    const folder = dryRun
      ? PREVIEW_FOLDER
      : `${STORIES_FOLDER}${slot.replace(':', '')}-${id}/`;
    if (dryRun) await this.deleteFolder(PREVIEW_FOLDER);
    try {
      run.stories = await this.publishStories(chosen, runKey, folder, now, {
        slot,
        dryRun,
      });
    } finally {
      // Instagram keeps its own copies once the containers are ready.
      if (!dryRun) await this.deleteFolder(folder);
    }

    const count = (status: StoryResult['status']) =>
      run.stories.filter((story) => story.status === status).length;
    run.outcome = dryRun
      ? 'previewed'
      : count('published') > 0
        ? 'published'
        : count('unknown') > 0
          ? 'unknown'
          : 'failed';
    run.error = run.stories.find((story) => story.error)?.error;
    this.log(run.outcome === 'failed' ? 'error' : 'log', 'run-finished', {
      slot,
      runKey,
      outcome: run.outcome,
      eligible: run.eligible,
      published: count('published'),
      failed: count('failed'),
      unknown: count('unknown'),
      skipped: count('skipped'),
    });
    return run;
  }

  /* The events that can have a story now: starting within the window, at
   * imported venues, with a picture in R2 and a title, and not promoted. */
  private async candidates(now: Date): Promise<Candidates> {
    const window = storyWindow(now, windowHours());
    const [events, promoted, recent] = await Promise.all([
      this.data.fetchEvents(window.from, window.until),
      this.history.promotedEvents(window.from, window.until),
      this.history.storiesSince(new Date(now.getTime() - RECENT_STORIES_MS)),
    ]);
    const eligible = withoutPromoted(
      events.filter(
        (event) =>
          this.r2Service.extractKeyFromUrl(event.pictureUrl) !== null &&
          hasStoryTitle(event),
      ),
      promoted,
    );
    return {
      eligible,
      recent,
      recentVenueIds: new Set(recent.map((story) => story.venueId)),
    };
  }

  /* Picks the run's events, downloads their pictures and claims them in
   * the history. An event whose picture won't download, or that another
   * run claimed meanwhile, is swapped for another pick. */
  private async pickAndClaim(
    { eligible, recentVenueIds }: Candidates,
    runKey: string,
    dryRun: boolean,
  ): Promise<EventWithPicture[]> {
    const count = storyCount(eventRange(), this.random);
    const chosen: EventWithPicture[] = [];
    let pool = eligible;
    for (
      let round = 1;
      round <= PICK_ROUNDS && chosen.length < count;
      round++
    ) {
      const picks = pickStoryEvents(pool, count, {
        picked: chosen.map(({ event }) => event),
        recentVenueIds,
        random: this.random,
      });
      if (picks.length === 0) break;
      pool = pool.filter((event) => !picks.includes(event));

      const downloads = await Promise.all(
        picks.map((event) => downloadPicture(event.pictureUrl)),
      );
      const withPictures = picks.flatMap((event, i): EventWithPicture[] => {
        const download = downloads[i];
        if ('picture' in download) {
          return [{ event, picture: download.picture }];
        }
        this.log('warn', 'picture-not-downloaded', {
          eventId: event.id,
          error: download.error,
        });
        return [];
      });

      const claimed = dryRun
        ? new Set(withPictures.map(({ event }) => event.id))
        : await this.history.claim(
            withPictures.map(({ event }) => event.id),
            'story',
            runKey,
          );
      for (const pick of withPictures) {
        if (claimed.has(pick.event.id)) chosen.push(pick);
        else
          this.log('warn', 'event-taken', { eventId: pick.event.id, runKey });
      }
    }
    return chosen.sort((a, b) => byStart(a.event, b.event));
  }

  /* Draws, stores and publishes the stories in date order, and records
   * each outcome in the history. After a failure the rest are skipped and
   * their claims let go: the next story would most likely fail the same way. */
  private async publishStories(
    chosen: EventWithPicture[],
    runKey: string,
    folder: string,
    now: Date,
    { slot, dryRun }: { slot: string; dryRun: boolean },
  ): Promise<StoryResult[]> {
    if (!dryRun) await this.graph.renewTokenIfDue(now);

    const results: StoryResult[] = [];
    let failed = false;
    for (const [index, { event, picture }] of chosen.entries()) {
      const story: StoryResult = {
        eventId: event.id,
        title: event.title,
        venue: event.venueName,
        group: event.group,
        startsAt: event.startsAt,
        day: storyDay(event.startsAt, now),
        status: 'skipped',
      };
      results.push(story);
      if (failed) {
        await this.writeHistory('release', event.id, () =>
          this.history.release([event.id], runKey),
        );
        continue;
      }

      let result: PublishResult;
      try {
        const jpeg = await renderStory({ event, picture, day: story.day });
        const imageUrl = await this.r2Service.uploadBuffer(
          `${folder}${String(index + 1).padStart(2, '0')}.jpg`,
          jpeg,
          'image/jpeg',
        );
        if (dryRun) {
          story.status = 'previewed';
          story.imageUrl = imageUrl;
          continue;
        }
        result = await this.graph.publishStory({
          imageUrl,
          mentions: event.instagramHandle ? [event.instagramHandle] : [],
        });
      } catch (error) {
        result = { status: 'failed', error: message(error) };
      }

      story.status = result.status;
      if (result.status === 'published') {
        const media = { mediaId: result.mediaId, permalink: result.permalink };
        Object.assign(story, media);
        await this.writeHistory('mark-published', event.id, () =>
          this.history.markPublished([event.id], runKey, media, new Date()),
        );
        this.log('log', 'story-published', {
          slot,
          eventId: event.id,
          ...media,
        });
        continue;
      }

      const error = result.error;
      story.error = error;
      if (dryRun) continue;
      if (result.status === 'unknown') {
        // Kept: the story may be up, so the event isn't promoted again.
        await this.writeHistory('mark-unknown', event.id, () =>
          this.history.markUnknown([event.id], runKey, error),
        );
        this.log('error', 'story-unknown', {
          slot,
          eventId: event.id,
          error,
          action: 'check the account; the event stays recorded',
        });
      } else {
        await this.writeHistory('release', event.id, () =>
          this.history.release([event.id], runKey),
        );
        this.log('error', 'story-failed', { slot, eventId: event.id, error });
      }
      failed = true;
    }
    return results;
  }

  /* A history write after Instagram has answered (the history tries it
   * three times). If it never goes through, the claim stays: the event
   * isn't promoted twice, but a published story's row isn't marked so. */
  private async writeHistory(
    action: string,
    eventId: string,
    write: () => Promise<void>,
  ): Promise<void> {
    try {
      await write();
    } catch (error) {
      this.log('error', 'history-not-written', {
        action,
        eventId,
        error: message(error),
      });
    }
  }

  /* Keeps what happened to the slot: done, or failed and waiting for its
   * next try. */
  private async recordSlot(
    slot: StorySlot,
    key: string,
    run: InstagramStoryRun,
    attempts: number,
    now: Date,
  ): Promise<InstagramStoryRun> {
    const next = run.outcome === 'failed' ? retryAt(slot, attempts) : null;
    const record: StorySlotRecord = {
      status: next ? 'retrying' : 'done',
      outcome: run.outcome,
      at: now.toISOString(),
      attempts,
      retryAt: next?.toISOString(),
      stories: run.stories
        .filter(
          (story) => story.status === 'published' || story.status === 'unknown',
        )
        .map((story) => ({
          eventId: story.eventId,
          mediaId: story.mediaId,
          permalink: story.permalink,
        })),
      error: run.error,
    };
    await this.redisService.set(
      key,
      record,
      next ? RETRYING_TTL_SECONDS : DONE_TTL_SECONDS,
    );
    if (run.outcome === 'failed') {
      this.log('error', next ? 'slot-retrying' : 'slot-given-up', {
        slot: slot.key,
        attempts,
        retryAt: record.retryAt,
        error: run.error,
      });
    }
    return { ...run, attempts, retryAt: record.retryAt };
  }

  /* Runs work while holding the lock all story runs share. */
  private async withLock(
    slot: string,
    now: Date,
    work: () => Promise<InstagramStoryRun>,
  ): Promise<InstagramStoryRun> {
    const locked = await this.redisService.setIfAbsent(
      LOCK_KEY,
      { slot, at: now.toISOString() },
      LOCK_TTL_SECONDS,
    );
    if (locked === null) {
      // Without the lock and the slot's record, the next tick could post
      // the slot again.
      return this.notPublished(slot, new Error("Redis didn't answer"));
    }
    if (!locked) return emptyRun(slot, 'in-progress');
    try {
      return await work();
    } finally {
      await this.redisService.del(LOCK_KEY);
    }
  }

  private notPublished(slot: string, error: unknown): InstagramStoryRun {
    const missing = error instanceof PublicationHistoryMissingError;
    this.log('error', 'not-published', { slot, error: message(error) });
    return {
      ...emptyRun(slot, missing ? 'not-configured' : 'failed'),
      error: message(error),
    };
  }

  /* What isn't set up for a run, or null. */
  private missingSetup(dryRun: boolean): string | null {
    if (!this.r2Service.isConfigured()) return 'R2 is not set up';
    if (!dryRun && !this.graph.isConfigured()) {
      return 'INSTAGRAM_ACCESS_TOKEN is not set';
    }
    return null;
  }

  private async deleteFolder(folder: string): Promise<void> {
    try {
      await this.r2Service.deleteFolder(folder);
    } catch (error) {
      this.log('warn', 'pictures-not-deleted', {
        folder,
        error: message(error),
      });
    }
  }

  private schedule(): StorySchedule {
    const schedule = parseStorySchedule(process.env.INSTAGRAM_STORIES_SCHEDULE);
    if (schedule.invalid.length > 0) {
      this.logger.warn(
        `INSTAGRAM_STORIES_SCHEDULE: left out ${schedule.invalid.join(', ')}`,
      );
    }
    return schedule;
  }

  /* One line per happening: its name, then its fields as JSON, so that the
   * logs can be searched by either. */
  private log(
    level: 'log' | 'warn' | 'error',
    event: string,
    fields: Record<string, unknown>,
  ): void {
    this.logger[level](`instagram-stories.${event} ${JSON.stringify(fields)}`);
  }
}

function windowHours(): number {
  return storyWindowHours(process.env.INSTAGRAM_STORIES_WINDOW_HOURS);
}

function eventRange(): StoryEventRange {
  return storyEventRange(process.env.INSTAGRAM_STORIES_EVENTS);
}

function slotKey(slot: StorySlot): string {
  return `${SLOT_KEY_PREFIX}:${slot.key}`;
}

/* A run's own id: Cloudflare caches a stored file for a day, so a run that
 * tries again never gets the pictures an earlier run drew. */
function runId(): string {
  return Date.now().toString(36);
}

/* What a slot's record says about a run now; null when it may run. */
function settledOutcome(
  record: StorySlotRecord | null,
  now: Date,
): InstagramStoryOutcome | null {
  if (!record) return null;
  if (record.status === 'done') return 'already-done';
  return record.retryAt && now.getTime() < Date.parse(record.retryAt)
    ? 'waiting'
    : null;
}

function recordedRun(
  slot: string,
  outcome: InstagramStoryOutcome,
  record: StorySlotRecord | null,
): InstagramStoryRun {
  return {
    ...emptyRun(slot, outcome),
    attempts: record?.attempts,
    retryAt: record?.retryAt,
    error: record?.error,
  };
}

function emptyRun(
  slot: string,
  outcome: InstagramStoryOutcome,
  dryRun = false,
): InstagramStoryRun {
  return { slot, dryRun, outcome, eligible: 0, stories: [] };
}

function plannedEvent(event: PostEvent, now: Date): PlannedStoryEvent {
  return {
    id: event.id,
    title: event.title,
    venue: event.venueName,
    group: event.group,
    startsAt: event.startsAt,
    day: storyDay(event.startsAt, now),
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
