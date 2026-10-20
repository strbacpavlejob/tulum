import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from '../users/users.service';
import { MatchesService } from './matches.service';
import { SwipeDecisionDto } from './dto/swipe-decision.dto';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * GET /matches/mine
   * Returns all matches for the authenticated user, enriched with the other
   * guest's profile, event/venue info, and the associated chat id (if any).
   */
  @Get('mine')
  async getMyMatches(@UserId() userId: string) {
    return this.matchesService.getMyMatches(userId);
  }

  /**
   * GET /matches — matches the caller is part of (optionally for one
   * event_id). guest_id may name another user only for admins; admins can
   * also list every match by leaving it out.
   */
  @Get()
  async getMatches(
    @UserId() userId: string,
    @Query('id') id?: string,
    @Query('guest_id') guestId?: string,
    @Query('event_id') eventId?: string,
  ) {
    const isAdmin = await this.usersService.isAdmin(userId);

    if (id) {
      const match = await this.matchesService.getMatchById(parseInt(id, 10));
      // Someone else's match looks the same as a missing one.
      const isParticipant =
        match?.guest_id_1 === userId || match?.guest_id_2 === userId;
      if (!match || (!isAdmin && !isParticipant)) {
        throw new NotFoundException('Match not found');
      }
      return match;
    }

    if (isAdmin) return this.matchesService.getMatches(guestId, eventId);
    if (guestId && guestId !== userId) {
      throw new ForbiddenException('You can only list your own matches');
    }
    return this.matchesService.getMatches(userId, eventId);
  }

  // Creating or deleting arbitrary matches is admin-only. Guests match
  // through /matches/swipe.
  @Post()
  @UseGuards(AdminGuard)
  async createMatch(@Body() match: Record<string, unknown>) {
    return this.matchesService.createMatch(match);
  }

  @Post('swipe')
  submitSwipe(
    @UserId() userId: string,
    @Body() body: SwipeDecisionDto,
  ): Promise<{ matched: boolean; match_id: number | null }> {
    return this.matchesService.submitSwipeDecision(userId, body);
  }

  @Delete()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteMatch(@Query('id', ParseIntPipe) id: number) {
    await this.matchesService.deleteMatch(id);
    return { success: true };
  }
}
