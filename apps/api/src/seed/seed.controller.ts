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
}
