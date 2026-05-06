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
    if (id) return this.ticketsService.getTicketById(parseInt(id, 10));
    return this.ticketsService.getTickets(
      guestId,
      eventId ? parseInt(eventId, 10) : undefined,
    );
  }

  @Post()
  async createTicket(@Body() ticket: Record<string, unknown>) {
    return this.ticketsService.createTicket(ticket);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteTicket(@Query('id', ParseIntPipe) id: number) {
    await this.ticketsService.deleteTicket(id);
    return { success: true };
  }
}
