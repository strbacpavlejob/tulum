/// <reference types="multer" />

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Logger,
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
import { parsePageLimit } from '../common/paging';
import { AttributionService } from '../retention/attribution.service';
import { ConsentsService } from '../retention/consents.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { GuestsService } from './guests.service';
import { SwipeDeckService } from './swipe-deck.service';

@ApiTags('guests')
@Controller('guests')
export class GuestsController {
  private readonly logger = new Logger(GuestsController.name);

  constructor(
    private readonly guestsService: GuestsService,
    private readonly swipeDeckService: SwipeDeckService,
    private readonly consents: ConsentsService,
    private readonly attribution: AttributionService,
  ) {}

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
   * user's current active event session. Guests blocked either way are left
   * out, and so is anyone whose visibility doesn't include the caller. A
   * hidden caller gets nobody (visibility: 'hidden').
   *
   * One page at a time: limit profiles (25 unless given, at most 50; 0 for
   * the counts alone), the guests the filters keep. Pass next_cursor back as
   * cursor for the next page; it is null on the last one. end_cursor marks
   * the page's last guest, from where guests who check in later follow.
   * present_guest_count counts the guests shown before the filters.
   */
  @Get('swipeable')
  async getSwipeable(
    @UserId() userId: string,
    @Query('event_id') eventId?: string,
    @Query('gender_filter') genderFilter?: string,
    @Query('age_min') ageMin?: string,
    @Query('age_max') ageMax?: string,
    @Query('selected_interests') selectedInterests?: string | string[],
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');

    const parsedAgeMin = Number.parseInt(ageMin ?? '', 10);
    const parsedAgeMax = Number.parseInt(ageMax ?? '', 10);

    const interests = Array.isArray(selectedInterests)
      ? selectedInterests
      : typeof selectedInterests === 'string'
        ? selectedInterests.split(',')
        : [];

    return this.swipeDeckService.getSwipeableGuests(
      userId,
      eventId,
      {
        genderFilter,
        ageMin: Number.isFinite(parsedAgeMin) ? parsedAgeMin : null,
        ageMax: Number.isFinite(parsedAgeMax) ? parsedAgeMax : null,
        selectedInterests: interests,
      },
      { cursor: cursor ?? null, limit: parsePageLimit(limit) },
    );
  }

  @Post('onboarding')
  async submitOnboarding(@UserId() userId: string, @Body() dto: OnboardingDto) {
    if (!userId)
      throw new BadRequestException('Missing required header: x-user-id');
    const result = await this.guestsService.upsertOnboarding(userId, dto);
    await this.recordSignup(userId, dto);
    return result;
  }

  /**
   * The guest's answer to the launch email checkbox and the platform they
   * signed up on. Kept beside the profile: a failure here is logged and
   * doesn't undo onboarding.
   */
  private async recordSignup(userId: string, dto: OnboardingDto) {
    if (dto.launch_email_opt_in !== undefined && dto.consent_wording) {
      try {
        await this.consents.recordAppLaunch(userId, {
          granted: dto.launch_email_opt_in,
          wording: dto.consent_wording,
          language: dto.language,
          platform: dto.signup_platform,
          source: 'onboarding',
        });
      } catch (err) {
        this.logger.warn(
          `Launch email answer not recorded: ${(err as Error).message}`,
        );
      }
    }
    await this.attribution.recordSignupPlatform(userId, dto.signup_platform);
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
