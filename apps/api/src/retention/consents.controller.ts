import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { ConsentsService } from './consents.service';
import { AppLaunchConsentDto } from './dto/app-launch-consent.dto';

// Always the signed-in caller's own answers.
@ApiTags('consents')
@Controller('users/me/consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  /** The caller's answer to "Email me when the Tulum app is out". */
  @Get()
  async getMine(@UserId() userId: string) {
    return { app_launch: await this.consents.appLaunch(userId) };
  }

  /** Changes the answer from Settings. The earlier answers are kept. */
  @Put('app-launch')
  async setAppLaunch(
    @UserId() userId: string,
    @Body() dto: AppLaunchConsentDto,
  ) {
    await this.consents.recordAppLaunch(userId, { ...dto, source: 'settings' });
    return { app_launch: await this.consents.appLaunch(userId) };
  }
}
