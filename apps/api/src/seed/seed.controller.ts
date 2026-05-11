import { Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  /**
   * POST /seed/mock-chats/:userId
   *
   * Creates mock data for the given userId:
   *  - Mock venue + event (ended, won't appear in active feed)
   *  - Matches with up to 3 other guests already in the DB
   *  - A chat per match with realistic seeded messages
   *
   * Safe to call multiple times (existing match pairs are skipped).
   */
  @Post('mock-chats/:userId')
  @ApiOperation({ summary: 'Seed mock chat data for a user (dev only)' })
  seedMockChats(@Param('userId') userId: string) {
    return this.seedService.seedMockChats(userId);
  }

  /**
   * POST /seed/mock-swipes/:userId
   *
   * Creates swipeable mock profiles for the given userId:
   *  - Ensures user has guest + host profiles
   *  - Creates a mock venue + currently-active event
   *  - Creates 5 mock user+guest records with real-looking photos (picsum)
   *  - Checks all mock users AND the requesting user into the event
   *    so they appear under GET /guests/swipeable
   *
   * Safe to call multiple times (generates unique venue/event each call).
   */
  @Post('mock-swipes/:userId')
  @ApiOperation({
    summary: 'Seed mock swipeable profiles for a user (dev only)',
  })
  seedMockSwipes(@Param('userId') userId: string) {
    return this.seedService.seedMockSwipes(userId);
  }
}
