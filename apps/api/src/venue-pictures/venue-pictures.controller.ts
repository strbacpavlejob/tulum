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
import { VenuePicturesService } from './venue-pictures.service';

// Runs paid Apify lookups and writes venue pictures — admin-only.
@ApiTags('venue-pictures')
@UseGuards(AdminGuard)
@Controller('venue-pictures')
export class VenuePicturesController {
  constructor(private readonly venuePicturesService: VenuePicturesService) {}

  /**
   * GET /venue-pictures/missing
   *
   * Counts the imported venues without a picture, and shows the Apify
   * account's usage. Looks nothing up and changes nothing.
   */
  @Get('missing')
  @ApiOperation({
    summary: 'Count imported venues without a picture',
    description:
      "How many imported venues have no picture, how many of them have an Instagram handle or an upcoming event, how many wait to be tried again, and the Apify account's usage in its billing cycle against the job's budget. Free: nothing is looked up.",
  })
  previewMissingPictures() {
    return this.venuePicturesService.previewMissingPictures();
  }

  /**
   * POST /venue-pictures/fill
   *
   * What the hourly job does, now, within the same Apify budget. With
   * dryRun=true it looks the venues up and downloads their pictures, and
   * saves nothing.
   */
  @Post('fill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fill in missing venue pictures from Instagram',
    description:
      "Gives imported venues without a picture their Instagram profile picture, finding a missing handle on the venue's Google Maps listing. Apify charges for the lookups, dry run included.",
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Look up and download, but save nothing',
  })
  fillMissingPictures(@Query('dryRun') dryRun?: string) {
    return this.venuePicturesService.fillMissingPictures({
      dryRun: dryRun === 'true',
    });
  }
}
