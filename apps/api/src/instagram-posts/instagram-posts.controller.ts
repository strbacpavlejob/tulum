import {
  BadRequestException,
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
import { isPostKind, POST_KINDS, PostKind } from './instagram-post-rules';
import { InstagramPostsService } from './instagram-posts.service';

// Draws and publishes posts on Tulum's Instagram account — admin-only.
@ApiTags('instagram-posts')
@UseGuards(AdminGuard)
@Controller('instagram-posts')
export class InstagramPostsController {
  constructor(private readonly instagramPostsService: InstagramPostsService) {}

  /**
   * GET /instagram-posts/plan
   *
   * The events and caption a post would have today, the schedule, and what
   * happened to today's post. Draws nothing and changes nothing.
   */
  @Get('plan')
  @ApiOperation({
    summary: "Show today's Instagram post",
    description:
      "The events and caption a post of the given kind (by default today's scheduled one) would have today, the weekly schedule, whether Instagram and R2 are set up, and today's record of the post.",
  })
  @ApiQuery({ name: 'kind', required: false, enum: POST_KINDS })
  plan(@Query('kind') kind?: string) {
    return this.instagramPostsService.plan(parseKind(kind));
  }

  /**
   * POST /instagram-posts/publish
   *
   * Draws a post and publishes it on Instagram now, unless today's post of
   * that kind went out already. With dryRun=true, the slides are stored in
   * R2 to look at and nothing is posted.
   */
  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish an Instagram post now',
    description:
      "Picks the rest of the week's events for the given kind, draws the carousel and publishes it. A kind goes out once a day. With dryRun the slides are only stored, and their links returned.",
  })
  @ApiQuery({ name: 'kind', required: true, enum: POST_KINDS })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: Boolean,
    description: 'Draw and store the slides, but post nothing',
  })
  publish(@Query('kind') kind?: string, @Query('dryRun') dryRun?: string) {
    const postKind = parseKind(kind);
    if (!postKind) {
      throw new BadRequestException(`kind is one of ${POST_KINDS.join(', ')}`);
    }
    return this.instagramPostsService.publish(postKind, {
      dryRun: dryRun === 'true',
    });
  }
}

function parseKind(kind?: string): PostKind | undefined {
  if (kind === undefined || kind === '') return undefined;
  if (!isPostKind(kind)) {
    throw new BadRequestException(`kind is one of ${POST_KINDS.join(', ')}`);
  }
  return kind;
}
