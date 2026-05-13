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
import { UserId } from '../common/decorators/user-id.decorator';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(
    @UserId() userId: string,
    @Query('event_id') eventId?: string,
  ) {
    if (eventId) {
      return this.favoritesService.isFavorited(userId, parseInt(eventId, 10));
    }
    return this.favoritesService.getFavorites(userId);
  }

  @Post()
  async addFavorite(
    @UserId() userId: string,
    @Body('event_id', ParseIntPipe) eventId: number,
  ) {
    return this.favoritesService.addFavorite(userId, eventId);
  }

  @Post('seen')
  @HttpCode(HttpStatus.OK)
  async trackSeen(
    @UserId() userId: string,
    @Body('event_id', ParseIntPipe) eventId: number,
  ) {
    await this.favoritesService.trackSeen(userId, eventId);
    return { ok: true };
  }

  @Post('toggle')
  async toggleFavorite(
    @UserId() userId: string,
    @Body('event_id', ParseIntPipe) eventId: number,
  ) {
    return this.favoritesService.toggleFavorite(userId, eventId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async removeFavorite(
    @UserId() userId: string,
    @Query('event_id', ParseIntPipe) eventId: number,
  ) {
    return this.favoritesService.removeFavorite(userId, eventId);
  }
}
