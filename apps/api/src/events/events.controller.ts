import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { CleanupEventsDto } from './dto/cleanup-events.dto';

interface EventSessionRow {
  id: number;
  user_id: string;
  event_id: string;
  ticket_id: string | null;
  entered_at: string;
  exited_at: string | null;
  created_at: string;
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Delete('cleanup')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete past events (admin only)',
    description:
      'Deletes events whose end_date_time is older than now, or older than a provided cutoff date.',
  })
  @ApiBody({
    type: CleanupEventsDto,
    required: false,
  })
  @ApiOkResponse({
    description: 'Number of deleted events',
    schema: {
      example: {
        deleted: 7,
      },
    },
  })
  async cleanup(@Body() body?: CleanupEventsDto) {
    const deleted = await this.supabaseService.deleteOldEvents(body?.before);
    return { deleted };
  }

  /**
   * POST /events/sessions
   * Check the current user in to an event. Body: { event_id: string }
   * One active session per user and event: when one is open, it is returned
   * instead of adding another (the app checks in on every load of Matches).
   */
  @Post('sessions')
  async createSession(
    @UserId() userId: string,
    @Body() body: { event_id?: string },
  ) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    const eventId = body?.event_id;
    if (!eventId)
      throw new BadRequestException('Missing required field: event_id');

    const open = await this.findActiveSession(userId, eventId);
    if (open) return { session: open };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('event_sessions')
      .insert({ user_id: userId, event_id: eventId })
      .select()
      .single<EventSessionRow>();
    if (error) {
      // A parallel check-in won the race: the unique index on active
      // sessions refused this one, so return that check-in's session.
      if ((error as { code?: string }).code === '23505') {
        const winner = await this.findActiveSession(userId, eventId);
        if (winner) return { session: winner };
      }
      throw error;
    }
    return { session: data };
  }

  /** The user's earliest open session at the event, if any. */
  private async findActiveSession(userId: string, eventId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('event_sessions')
      .select()
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .is('exited_at', null)
      .order('entered_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle<EventSessionRow>();
    if (error) throw error;
    return data;
  }
}
