import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
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

  @Post('onboarding')
  async submitOnboarding(@UserId() userId: string, @Body() dto: OnboardingDto) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.upsertOnboarding(userId, dto);
  }
}
