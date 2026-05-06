import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  async getStatistics(
    @UserId() userId: string,
    @Query('venue_id') venueId?: string,
    @Query('event_id') eventId?: string,
  ) {
    return this.statisticsService.getStatistics(userId, venueId, eventId);
  }
}
