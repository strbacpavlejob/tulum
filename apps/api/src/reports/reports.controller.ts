import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { ReportsService } from './reports.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { CreateVenueSuggestionDto } from './dto/create-venue-suggestion.dto';
import { BugRecord, VenueSuggestionRecord } from './reports.types';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('bugs')
  async createBug(
    @UserId() userId: string | undefined,
    @Body() body: CreateBugDto,
  ): Promise<BugRecord> {
    const created = (await this.reportsService.createBug(
      userId,
      body,
    )) as unknown as BugRecord;
    return created;
  }

  @Post('venue-suggestions')
  async createVenueSuggestion(
    @UserId() userId: string | undefined,
    @Body() body: CreateVenueSuggestionDto,
  ): Promise<VenueSuggestionRecord> {
    const created = (await this.reportsService.createVenueSuggestion(
      userId,
      body,
    )) as unknown as VenueSuggestionRecord;
    return created;
  }
}
