import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { parsePageLimit } from '../common/paging';
import { AttributionService } from '../retention/attribution.service';
import { UsersService } from '../users/users.service';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly usersService: UsersService,
    private readonly attribution: AttributionService,
  ) {}

  /**
   * GET /tickets — the caller's own tickets (optionally for one event_id).
   * guest_id may name another user only for admins; admins can also list
   * everyone's tickets by leaving it out.
   */
  @Get()
  async getTickets(
    @UserId() userId: string,
    @Query('id') id?: string,
    @Query('guest_id') guestId?: string,
    @Query('event_id') eventId?: string,
  ) {
    const isAdmin = await this.usersService.isAdmin(userId);

    if (id) {
      const ticket = await this.ticketsService.getTicketById(id);
      // Someone else's ticket looks the same as a missing one.
      if (!ticket || (!isAdmin && ticket.guest_id !== userId)) {
        throw new NotFoundException('Ticket not found');
      }
      return ticket;
    }

    if (isAdmin) return this.ticketsService.getTickets(guestId, eventId);
    if (guestId && guestId !== userId) {
      throw new ForbiddenException('You can only list your own tickets');
    }
    return this.ticketsService.getTickets(userId, eventId);
  }

  /**
   * GET /tickets/attendees?event_id=X: limit guests a page (30 unless
   * given, at most 50; 0 for the numbers alone); cursor is the nextCursor of
   * the page before.
   */
  @Get('attendees')
  async getEventAttendees(
    @UserId() userId: string,
    @Query('event_id', ParseUUIDPipe) eventId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ticketsService.getEventAttendees(eventId, userId, {
      cursor: cursor ?? null,
      limit: parsePageLimit(limit),
    });
  }

  /**
   * src is the tag of the QR poster that brought the guest, if any
   * (/e/{id}?src=p07). On the guest's first join it is kept with the event.
   */
  @Post('attend')
  async attendEvent(
    @UserId() userId: string,
    @Body('event_id', ParseUUIDPipe) eventId: string,
    @Body('src') src?: unknown,
  ) {
    const result = await this.ticketsService.attendEvent(userId, eventId);
    if (result.isNew) {
      await this.attribution.recordFirstEvent(userId, eventId, src);
    }
    return result;
  }

  @Delete('attend')
  @HttpCode(HttpStatus.OK)
  async unattendEvent(
    @UserId() userId: string,
    @Query('event_id', ParseUUIDPipe) eventId: string,
  ) {
    return this.ticketsService.unattendEvent(userId, eventId);
  }

  // Raw create/delete for any guest — admin-only. Guests RSVP and cancel
  // through /tickets/attend.

  @Post()
  @UseGuards(AdminGuard)
  async createTicket(@Body() ticket: Record<string, unknown>) {
    return this.ticketsService.createTicket(ticket);
  }

  @Delete()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteTicket(@Query('id', ParseUUIDPipe) id: string) {
    await this.ticketsService.deleteTicket(id);
    return { success: true };
  }
}
