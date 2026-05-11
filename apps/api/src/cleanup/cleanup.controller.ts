import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CleanupService } from './cleanup.service';

@ApiTags('cleanup')
@Controller('cleanup')
export class CleanupController {
  constructor(private readonly cleanupService: CleanupService) {}

  /**
   * GET /cleanup/expired-matches
   *
   * Dry-run: returns which matches and events would be removed.
   * Does NOT delete anything.
   */
  @Get('expired-matches')
  @ApiOperation({
    summary: 'Preview expired matches (dry-run)',
    description:
      'Returns all matches whose event has passed, grouped by event. Nothing is deleted.',
  })
  previewExpiredMatches() {
    return this.cleanupService.previewExpiredMatches();
  }

  /**
   * DELETE /cleanup/expired-matches
   *
   * Deletes all matches (+ cascaded chats and messages) for events
   * whose end_date_time is in the past.
   */
  @Delete('expired-matches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete all expired matches',
    description:
      'Removes matches for every past event. Chats and messages are cascaded automatically.',
  })
  cleanupExpiredMatches() {
    return this.cleanupService.cleanupExpiredMatches();
  }

  /**
   * DELETE /cleanup/events/:eventId/matches
   *
   * Deletes all matches (+ chats/messages) for a single specific event.
   */
  @Delete('events/:eventId/matches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all matches for a specific event' })
  cleanupMatchesForEvent(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.cleanupService.cleanupMatchesForEvent(eventId);
  }
}
