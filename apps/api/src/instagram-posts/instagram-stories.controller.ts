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
import { InstagramStoriesService } from './instagram-stories.service';

// Draws and publishes stories on Tulum's Instagram account — admin-only.
@ApiTags('instagram-stories')
@UseGuards(AdminGuard)
@Controller('instagram-stories')
export class InstagramStoriesController {
  constructor(
    private readonly instagramStoriesService: InstagramStoriesService,
  ) {}

  /**
   * GET /instagram-stories/plan
   *
   * The schedule, the slot running now and its record, the events a run now
   * could show and a random pick from them, and the last day's stories.
   * Draws nothing and changes nothing.
   */
  @Get('plan')
  @ApiOperation({
    summary: 'Show the Instagram stories plan',
    description:
      "The stories' schedule and settings, whether Instagram, R2 and the publishing history are set up, the slot running now with its record, the events a run now could show with a sample pick, and the last day's stories.",
  })
  plan() {
    return this.instagramStoriesService.plan();
  }

  /**
   * POST /instagram-stories/publish
   *
   * Picks events and publishes their stories now, outside the schedule. No
   * event is promoted twice. With dryRun=true the stories are only drawn
   * and stored in R2, and their links returned.
   */
  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish Instagram stories now',
    description:
      "Picks two or three events that start within the next 48 hours and haven't been promoted, and publishes a story for each. With dryRun the stories are only stored, and their links returned.",
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Draw and store the stories, but post nothing',
  })
  publish(@Query('dryRun') dryRun?: string) {
    return this.instagramStoriesService.publish({ dryRun: dryRun === 'true' });
  }
}
