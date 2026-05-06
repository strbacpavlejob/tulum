import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  async getMatches(
    @Query('id') id?: string,
    @Query('guest_id') guestId?: string,
    @Query('event_id') eventId?: string,
  ) {
    if (id) return this.matchesService.getMatchById(parseInt(id, 10));
    return this.matchesService.getMatches(
      guestId,
      eventId ? parseInt(eventId, 10) : undefined,
    );
  }

  @Post()
  async createMatch(@Body() match: Record<string, unknown>) {
    return this.matchesService.createMatch(match);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteMatch(@Query('id', ParseIntPipe) id: number) {
    await this.matchesService.deleteMatch(id);
    return { success: true };
  }
}
