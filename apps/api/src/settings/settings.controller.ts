import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { UpdateMySettingsDto } from './dto/update-my-settings.dto';
import { SettingsService } from './settings.service';

// Always the signed-in caller's settings. The user_id query parameter older
// clients still send is ignored.
@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('me')
  async getMySettings(@UserId() userId: string) {
    return this.settingsService.getSettings(userId);
  }

  @Patch('me')
  async updateMySettings(
    @UserId() userId: string,
    @Body() body: UpdateMySettingsDto = {},
  ) {
    return this.settingsService.upsertSettings(userId, body);
  }
}
