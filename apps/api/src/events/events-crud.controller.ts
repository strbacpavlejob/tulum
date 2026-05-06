import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import { GetActiveEventsDto } from './dto/get-active-events.dto';
import { EventsCrudService } from './events-crud.service';

@ApiTags('events')
@Controller('events')
export class EventsCrudController {
  constructor(private readonly eventsCrudService: EventsCrudService) {}

  /** Public — no API key required */
  @Get('active')
  @Public()
  async getActiveEvents(@Query() query: GetActiveEventsDto) {
    return this.eventsCrudService.getActiveEvents(query);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEventImage(
    @UserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('venue_id') venueId: string,
  ) {
    return this.eventsCrudService.uploadEventImage(userId, venueId, file);
  }

  @Delete('upload')
  @HttpCode(HttpStatus.OK)
  async deleteEventImage(
    @UserId() userId: string,
    @Query('file') fileName: string,
  ) {
    await this.eventsCrudService.deleteEventImage(userId, fileName);
    return { success: true };
  }

  @Get()
  async getEvents(
    @UserId() userId: string,
    @Query('venue_id') venueId?: string,
    @Query('status') status?: string,
  ) {
    return this.eventsCrudService.getEvents(userId, venueId, status);
  }

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('picture'))
  async createEvent(
    @UserId() userId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.eventsCrudService.createEvent(userId, body, picture);
  }

  @Get(':id')
  async getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.eventsCrudService.getEventById(id);
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('picture'))
  async updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.eventsCrudService.updateEvent(id, userId, body, picture);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: string,
  ) {
    await this.eventsCrudService.deleteEvent(id, userId);
    return { success: true };
  }
}
