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
import { UserId } from '../common/decorators/user-id.decorator';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  /**
   * GET /matches/mine
   * Returns all matches for the authenticated user, enriched with the other
   * guest's profile, event/venue info, and the associated chat id (if any).
   */
  @Get('mine')
  async getMyMatches(@UserId() userId: string) {
    return this.matchesService.getMyMatches(userId);
  }

  @Get()
  async getMatches(
    @Query('id') id?: string,
    @Query('guest_id') guestId?: string,
    @Query('event_id') eventId?: string,
  ) {
    if (id) return this.matchesService.getMatchById(parseInt(id, 10));
    return this.matchesService.getMatches(guestId, eventId ?? undefined);
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
