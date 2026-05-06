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
import { UserId } from '../common/decorators/user-id.decorator';
import { VenuesService } from './venues.service';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVenueImage(
    @UserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('venue_id') venueId?: string,
  ) {
    return this.venuesService.uploadVenueImage(userId, venueId, file);
  }

  @Delete('upload')
  @HttpCode(HttpStatus.OK)
  async deleteVenueImage(
    @UserId() userId: string,
    @Query('file') fileName: string,
  ) {
    await this.venuesService.deleteVenueImage(userId, fileName);
    return { success: true };
  }

  @Get()
  async getVenues(@Query('host_id') hostId?: string) {
    return this.venuesService.getVenues(hostId);
  }

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('picture'))
  async createVenue(
    @UserId() userId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.venuesService.createVenue(userId, body, picture);
  }

  @Get(':id')
  async getVenue(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.getVenueById(id);
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('picture'))
  async updateVenue(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: string,
    @Body() body: Record<string, unknown>,
    @UploadedFile() picture?: Express.Multer.File,
  ) {
    return this.venuesService.updateVenue(id, userId, body, picture);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteVenue(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: string,
  ) {
    await this.venuesService.deleteVenue(id, userId);
    return { success: true };
  }
}
