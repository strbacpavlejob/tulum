import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  async getMySettings(
    @UserId() userId: string,
    @Query('user_id') queryUserId?: string,
  ) {
    const id = userId ?? queryUserId;
    if (!id) throw new BadRequestException('Missing user id');
    return this.settingsService.getSettings(id);
  }

  @Patch('me')
  async updateMySettings(
    @UserId() userId: string,
    @Query('user_id') queryUserId?: string,
    @Body() body: { language?: string; theme?: string } = {},
  ) {
    const id = userId ?? queryUserId;
    if (!id) throw new BadRequestException('Missing user id');
    return this.settingsService.upsertSettings(id, body);
  }
}
