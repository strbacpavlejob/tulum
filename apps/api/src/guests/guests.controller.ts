import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { OnboardingDto } from './dto/onboarding.dto';
import { GuestsService } from './guests.service';

@ApiTags('guests')
@Controller('guests')
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('me')
  async getMe(@UserId() userId: string) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.getGuestMe(userId);
  }

  /**
   * GET /guests/swipeable?event_id=X
   *
   * Returns guests at the same event (via event_sessions) who the current user
   * hasn't matched with yet. If event_id is omitted, auto-detects from the
   * user's current active event session.
   */
  @Get('swipeable')
  async getSwipeable(
    @UserId() userId: string,
    @Query('event_id') eventId?: string,
  ) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.getSwipeableGuests(
      userId,
      eventId ? parseInt(eventId, 10) : undefined,
    );
  }

  @Post('onboarding')
  async submitOnboarding(@UserId() userId: string, @Body() dto: OnboardingDto) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    return this.guestsService.upsertOnboarding(userId, dto);
  }

  /**
   * POST /guests/photos
   * Upload a single profile photo (max 3 total).
   * Accepts multipart/form-data with field name "photo".
   * Returns the updated picture_urls array.
   */
  @Post('photos')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiConsumes('multipart/form-data')
  async uploadPhoto(
    @UserId() userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 }), // 15 MB raw
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp|heic|heif)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    const pictureUrls = await this.guestsService.uploadPhoto(userId, file);
    return { picture_urls: pictureUrls };
  }

  /**
   * DELETE /guests/photos
   * Remove a profile photo by its URL.
   * Returns the updated picture_urls array.
   */
  @Delete('photos')
  async deletePhoto(@UserId() userId: string, @Body() body: { url: string }) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    if (!body?.url)
      throw new BadRequestException('Missing required field: url');
    const pictureUrls = await this.guestsService.deletePhoto(userId, body.url);
    return { picture_urls: pictureUrls };
  }
}
