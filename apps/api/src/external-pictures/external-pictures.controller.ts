import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';
import { ExternalPicturesService } from './external-pictures.service';

// Downloads pictures from other sites and writes them to R2 — admin-only.
@ApiTags('external-pictures')
@UseGuards(AdminGuard)
@Controller('external-pictures')
export class ExternalPicturesController {
  constructor(
    private readonly externalPicturesService: ExternalPicturesService,
  ) {}

  /**
   * GET /external-pictures/pending
   *
   * Counts the event and venue pictures still on other sites. Changes
   * nothing.
   */
  @Get('pending')
  @ApiOperation({
    summary: 'Count event and venue pictures still on other sites',
    description:
      'How many events (and how many of them upcoming) and venues have a picture_url outside the R2 bucket, by site, and how many of those failed to download and are being tried again.',
  })
  previewExternalPictures() {
    return this.externalPicturesService.previewExternalPictures();
  }

  /**
   * POST /external-pictures/store
   *
   * What the hourly job does, now. With dryRun=true it downloads the
   * pictures and saves nothing.
   */
  @Post('store')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Store event and venue pictures from other sites in R2',
    description:
      "Downloads each picture outside the R2 bucket, stores it as WebP under the row's key and points the row at it. A picture that is gone (404 or 410), or fails to download for a day, is cleared.",
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Download, but save nothing',
  })
  storeExternalPictures(@Query('dryRun') dryRun?: string) {
    return this.externalPicturesService.storeExternalPictures({
      dryRun: dryRun === 'true',
    });
  }
}
