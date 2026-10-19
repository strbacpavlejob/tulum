import { Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SeedService, type SeedEventOptions } from './seed.service';
import { AdminGuard } from '../common/guards/admin.guard';

/**
 * Optional query params shared by all seed endpoints (dev/QA only).
 * Omitting them keeps the original behaviour: event starts in 5 minutes,
 * lasts 15 minutes, the target user gets an active event session, an active
 * test event is reused, and 80% of incoming likes become matches.
 */
const SEED_QUERY_DOCS = [
  {
    name: 'starts_in_minutes',
    required: false,
    description: 'Minutes until a newly created test event starts (default 5)',
  },
  {
    name: 'duration_minutes',
    required: false,
    description: 'Duration of a newly created test event (default 15)',
  },
  {
    name: 'include_target_session',
    required: false,
    description:
      'Set to "false" to skip the target user event session so the app check-in creates it (default true)',
  },
  {
    name: 'force_new',
    required: false,
    description:
      'Set to "true" to create a new test event even if one is active (default false)',
  },
  {
    name: 'match_ratio',
    required: false,
    description:
      'Fraction of incoming likes turned into matches, 0-1 (default 0.8)',
  },
] as const;

function parseSeedOptions(
  startsInMinutes?: string,
  durationMinutes?: string,
  includeTargetSession?: string,
  forceNew?: string,
  matchRatio?: string,
): SeedEventOptions {
  const toInt = (value: string | undefined, min: number, max: number) => {
    if (value === undefined || value === '') return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.min(max, Math.max(min, parsed));
  };

  const ratio = matchRatio === undefined ? NaN : Number.parseFloat(matchRatio);

  return {
    startsInMinutes: toInt(startsInMinutes, -1440, 1440),
    durationMinutes: toInt(durationMinutes, 1, 1440),
    includeTargetSession: includeTargetSession !== 'false',
    forceNew: forceNew === 'true',
    matchRatio: Number.isFinite(ratio)
      ? Math.min(1, Math.max(0, ratio))
      : undefined,
  };
}

@ApiTags('seed')
@UseGuards(AdminGuard)
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  /**
   * POST /seed/mock-messages/:userId
   *
   * Full sequential seed chain:
   *  - Creates/reuses Tulum Test Event and attendance for all existing users
   *  - Seeds incoming likes from random 50% of other users
   *  - Creates matches for random 80% of incoming likes
   *  - Creates chats and incoming messages for those matches
   */
  @Post('mock-messages/:userId')
  @ApiOperation({
    summary: 'Seed event, swipes, matches and messages for a user (dev only)',
  })
  @ApiQuery(SEED_QUERY_DOCS[0])
  @ApiQuery(SEED_QUERY_DOCS[1])
  @ApiQuery(SEED_QUERY_DOCS[2])
  @ApiQuery(SEED_QUERY_DOCS[3])
  @ApiQuery(SEED_QUERY_DOCS[4])
  seedMockMessages(
    @Param('userId') userId: string,
    @Query('starts_in_minutes') startsInMinutes?: string,
    @Query('duration_minutes') durationMinutes?: string,
    @Query('include_target_session') includeTargetSession?: string,
    @Query('force_new') forceNew?: string,
    @Query('match_ratio') matchRatio?: string,
  ): Promise<unknown> {
    return this.seedService.seedMockMessages(
      userId,
      parseSeedOptions(
        startsInMinutes,
        durationMinutes,
        includeTargetSession,
        forceNew,
        matchRatio,
      ),
    );
  }

  /**
   * Backward compatible alias for mock-messages.
   */
  @Post('mock-chats/:userId')
  @ApiOperation({
    summary: 'Alias: seed mock messages data for a user (dev only)',
  })
  @ApiQuery(SEED_QUERY_DOCS[0])
  @ApiQuery(SEED_QUERY_DOCS[1])
  @ApiQuery(SEED_QUERY_DOCS[2])
  @ApiQuery(SEED_QUERY_DOCS[3])
  @ApiQuery(SEED_QUERY_DOCS[4])
  seedMockChats(
    @Param('userId') userId: string,
    @Query('starts_in_minutes') startsInMinutes?: string,
    @Query('duration_minutes') durationMinutes?: string,
    @Query('include_target_session') includeTargetSession?: string,
    @Query('force_new') forceNew?: string,
    @Query('match_ratio') matchRatio?: string,
  ): Promise<unknown> {
    return this.seedService.seedMockChats(
      userId,
      parseSeedOptions(
        startsInMinutes,
        durationMinutes,
        includeTargetSession,
        forceNew,
        matchRatio,
      ),
    );
  }

  /**
   * POST /seed/mock-swipes/:userId
   *
   * Ensures test event is available, then seeds incoming likes and matches:
   *  - Calls seedMockTestEvent(userId)
   *  - Randomly selects 50% of other users to like the given user
   *  - Randomly creates matches for 80% of those likes
   */
  @Post('mock-swipes/:userId')
  @ApiOperation({
    summary: 'Seed mock swipeable profiles for a user (dev only)',
  })
  @ApiQuery(SEED_QUERY_DOCS[0])
  @ApiQuery(SEED_QUERY_DOCS[1])
  @ApiQuery(SEED_QUERY_DOCS[2])
  @ApiQuery(SEED_QUERY_DOCS[3])
  @ApiQuery(SEED_QUERY_DOCS[4])
  seedMockSwipes(
    @Param('userId') userId: string,
    @Query('starts_in_minutes') startsInMinutes?: string,
    @Query('duration_minutes') durationMinutes?: string,
    @Query('include_target_session') includeTargetSession?: string,
    @Query('force_new') forceNew?: string,
    @Query('match_ratio') matchRatio?: string,
  ): Promise<unknown> {
    return this.seedService.seedMockSwipes(
      userId,
      parseSeedOptions(
        startsInMinutes,
        durationMinutes,
        includeTargetSession,
        forceNew,
        matchRatio,
      ),
    );
  }

  /**
   * POST /seed/mock-test-event/:userId
   *
   * Creates/reuses Tulum Test Event for the given userId.
   * Uses DEFAULT_VENUE_HOST_ID as venue host.
   * Uses all existing users as attendees.
   * Event starts in 5 minutes and lasts 15 minutes on first creation
   * (override with starts_in_minutes / duration_minutes).
   * Reuses existing event/timestamps on subsequent calls.
   */
  @Post('mock-test-event/:userId')
  @ApiOperation({
    summary: 'Seed a test event with all guests attending (dev only)',
  })
  @ApiQuery(SEED_QUERY_DOCS[0])
  @ApiQuery(SEED_QUERY_DOCS[1])
  @ApiQuery(SEED_QUERY_DOCS[2])
  @ApiQuery(SEED_QUERY_DOCS[3])
  @ApiQuery(SEED_QUERY_DOCS[4])
  seedMockTestEvent(
    @Param('userId') userId: string,
    @Query('starts_in_minutes') startsInMinutes?: string,
    @Query('duration_minutes') durationMinutes?: string,
    @Query('include_target_session') includeTargetSession?: string,
    @Query('force_new') forceNew?: string,
    @Query('match_ratio') matchRatio?: string,
  ): Promise<unknown> {
    return this.seedService.seedMockTestEvent(
      userId,
      parseSeedOptions(
        startsInMinutes,
        durationMinutes,
        includeTargetSession,
        forceNew,
        matchRatio,
      ),
    );
  }
}
