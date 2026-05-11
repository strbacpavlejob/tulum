import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { OnboardingDto } from './dto/onboarding.dto';
import { GuestsService } from './guests.service';

@ApiTags('guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('me')
  async getMe(@UserId() userId: string) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.getGuestMe(userId);
  }

  /**
   * GET /guests/swipeable?event_id=X
   *
   * Returns guests at the same event (via event_sessions) who the current user
   * hasn't matched with yet. If event_id is omitted, auto-detects from the
   * user's current active event session.
   */
  @Get('swipeable')
  async getSwipeable(
    @UserId() userId: string,
    @Query('event_id') eventId?: string,
  ) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.getSwipeableGuests(
      userId,
      eventId ? parseInt(eventId, 10) : undefined,
    );
  }

  @Post('onboarding')
  async submitOnboarding(@UserId() userId: string, @Body() dto: OnboardingDto) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.upsertOnboarding(userId, dto);
  }
}
