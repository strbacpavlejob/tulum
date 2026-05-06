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
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getFavorites(
    @Query('user_id') userId: string,
    @Query('event_id') eventId?: string,
  ) {
    if (eventId) {
      return this.favoritesService.isFavorited(userId, parseInt(eventId, 10));
    }
    return this.favoritesService.getFavorites(userId);
  }

  @Post()
  async addFavorite(
    @Body('user_id') userId: string,
    @Body('event_id') eventId: number,
  ) {
    return this.favoritesService.addFavorite(userId, eventId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async removeFavorite(@Query('id', ParseIntPipe) id: number) {
    await this.favoritesService.removeFavorite(id);
    return { success: true };
  }
}
