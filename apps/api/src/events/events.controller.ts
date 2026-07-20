import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { CleanupEventsDto } from './dto/cleanup-events.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Delete('cleanup')
  @ApiOperation({
    summary: 'Delete past events',
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
   * Create an event session (check-in) for the current user.
   * Body: { event_id: string }
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
    const { data, error } = await this.supabaseService
      .getClient()
      .from('event_sessions')
      .insert({ user_id: userId, event_id: eventId })
      .select()
      .single();
    if (error) throw error;
    return { session: data };
  }
}
