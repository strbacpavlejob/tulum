import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { CleanupService } from './cleanup.service';

// Maintenance over every user's matches — admin-only.
@ApiTags('cleanup')
@UseGuards(AdminGuard)
@Controller('cleanup')
export class CleanupController {
  constructor(private readonly cleanupService: CleanupService) {}

  /**
   * GET /cleanup/expired-matches
   *
   * Dry-run: returns which matches and events would be archived.
   * Changes nothing.
   */
  @Get('expired-matches')
  @ApiOperation({
    summary: 'Preview expired matches (dry-run)',
    description:
      'Returns the matches not yet archived whose event has passed, grouped by event. Nothing changes.',
  })
  previewExpiredMatches() {
    return this.cleanupService.previewExpiredMatches();
  }

  /**
   * DELETE /cleanup/expired-matches
   *
   * Archives the matches of every event whose end_date_time is in the past.
   * Nothing is deleted (the path is kept for existing callers).
   */
  @Delete('expired-matches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive all expired matches',
    description:
      "Archives the matches of every past event: they leave the guests' inboxes, and the matches, chats and messages stay in the database.",
  })
  cleanupExpiredMatches() {
    return this.cleanupService.cleanupExpiredMatches();
  }

  /**
   * DELETE /cleanup/events/:eventId/matches
   *
   * Archives the matches of one event. Nothing is deleted.
   */
  @Delete('events/:eventId/matches')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive the matches of a specific event' })
  cleanupMatchesForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.cleanupService.cleanupMatchesForEvent(eventId);
  }
}
