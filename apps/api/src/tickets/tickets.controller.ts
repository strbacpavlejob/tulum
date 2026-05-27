import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getTickets(
    @Query('id') id?: string,
    @Query('guest_id') guestId?: string,
    @Query('event_id') eventId?: string,
  ) {
    if (id) return this.ticketsService.getTicketById(id);
    return this.ticketsService.getTickets(guestId, eventId);
  }

  @Get('attendees')
  async getEventAttendees(@Query('event_id', ParseUUIDPipe) eventId: string) {
    return this.ticketsService.getEventAttendees(eventId);
  }

  @Post('attend')
  async attendEvent(
    @UserId() userId: string,
    @Body('event_id', ParseUUIDPipe) eventId: string,
  ) {
    return this.ticketsService.attendEvent(userId, eventId);
  }

  @Delete('attend')
  @HttpCode(HttpStatus.OK)
  async unattendEvent(
    @UserId() userId: string,
    @Query('event_id', ParseUUIDPipe) eventId: string,
  ) {
    return this.ticketsService.unattendEvent(userId, eventId);
  }

  @Post()
  async createTicket(@Body() ticket: Record<string, unknown>) {
    return this.ticketsService.createTicket(ticket);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteTicket(@Query('id', ParseUUIDPipe) id: string) {
    await this.ticketsService.deleteTicket(id);
    return { success: true };
  }
}
