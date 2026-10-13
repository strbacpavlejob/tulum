import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { AdminGuard } from '../common/guards/admin.guard';

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
  seedMockMessages(@Param('userId') userId: string): Promise<unknown> {
    return this.seedService.seedMockMessages(userId);
  }

  /**
   * Backward compatible alias for mock-messages.
   */
  @Post('mock-chats/:userId')
  @ApiOperation({
    summary: 'Alias: seed mock messages data for a user (dev only)',
  })
  seedMockChats(@Param('userId') userId: string): Promise<unknown> {
    return this.seedService.seedMockChats(userId);
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
  seedMockSwipes(@Param('userId') userId: string): Promise<unknown> {
    return this.seedService.seedMockSwipes(userId);
  }

  /**
   * POST /seed/mock-test-event/:userId
   *
   * Creates/reuses Tulum Test Event for the given userId.
   * Uses DEFAULT_VENUE_HOST_ID as venue host.
   * Uses all existing users as attendees.
   * Event starts in 5 minutes and lasts 15 minutes on first creation.
   * Reuses existing event/timestamps on subsequent calls.
   */
  @Post('mock-test-event/:userId')
  @ApiOperation({
    summary: 'Seed a test event with all guests attending (dev only)',
  })
  seedMockTestEvent(@Param('userId') userId: string): Promise<unknown> {
    return this.seedService.seedMockTestEvent(userId);
  }
}
