import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { checkinRadiusMeters } from '../common/checkin-radius';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { CleanupService } from '../cleanup/cleanup.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  haversineMeters,
  isAtVenue,
  isEventOn,
  venuePosition,
} from './check-in-rules';
import { CleanupEventsDto } from './dto/cleanup-events.dto';
import { CreateEventSessionDto } from './dto/create-event-session.dto';

interface EventSessionRow {
  id: number;
  user_id: string;
  event_id: string;
  ticket_id: string | null;
  entered_at: string;
  exited_at: string | null;
  created_at: string;
}

interface CheckInTicketRow {
  id: string;
  events: {
    start_date_time: string | null;
    end_date_time: string | null;
    venues: { latitude: number | null; longitude: number | null } | null;
  } | null;
}

/** Why a check-in was refused; the app shows the screen that fits. */
type CheckInRefusal =
  | 'no_ticket'
  | 'not_live'
  | 'no_venue_location'
  | 'too_far';

function refusal(reason: CheckInRefusal, message: string) {
  return new ForbiddenException({ message, reason });
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cleanupService: CleanupService,
  ) {}

  @Delete('cleanup')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Delete past events (admin only)',
    description:
      'Deletes events whose end_date_time is older than now, or older than a provided cutoff date, and that have no matches. Events with matches stay, with their matches, chats and messages.',
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
    const deleted = await this.cleanupService.deleteOldEvents(body?.before);
    return { deleted };
  }

  /**
   * POST /events/sessions
   * Check the current user in to an event. Body: { event_id, latitude,
   * longitude, accuracy }, the position the phone read just before. Only a
   * guest with a ticket, while the event is on and near its venue, by the
   * app's rules (check-in-rules.ts); a refusal is a 403 with a reason. The
   * position is only compared with the venue's, never stored.
   * One active session per user and event: when one is open, it is returned
   * instead of adding another (the app checks in on every load of Matches).
   */
  @Post('sessions')
  async createSession(
    @UserId() userId: string,
    @Body() body: CreateEventSessionDto,
  ) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    const eventId = body.event_id;

    const open = await this.findActiveSession(userId, eventId);
    if (open) return { session: open };

    const ticket = await this.findTicket(userId, eventId);
    if (!ticket) {
      throw refusal('no_ticket', 'Join the event before checking in');
    }
    const event = ticket.events;
    if (!isEventOn(event?.start_date_time, event?.end_date_time, Date.now())) {
      throw refusal('not_live', 'The event is not on right now');
    }
    const venue = venuePosition(event?.venues);
    if (!venue) {
      throw refusal('no_venue_location', "The venue's location isn't set");
    }
    const distance = haversineMeters(
      body.latitude,
      body.longitude,
      venue.latitude,
      venue.longitude,
    );
    if (!isAtVenue(distance, body.accuracy, checkinRadiusMeters())) {
      throw refusal('too_far', 'You need to be at the venue to check in');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('event_sessions')
      .insert({ user_id: userId, event_id: eventId, ticket_id: ticket.id })
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

  /** The user's ticket for the event, with its times and venue position. */
  private async findTicket(userId: string, eventId: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('tickets')
      .select(
        'id, events(start_date_time, end_date_time, venues(latitude, longitude))',
      )
      .eq('guest_id', userId)
      .eq('event_id', eventId)
      .maybeSingle<CheckInTicketRow>();
    if (error) throw error;
    return data;
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
