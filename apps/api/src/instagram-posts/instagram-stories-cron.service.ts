import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { POST_TIME_ZONE } from './instagram-post-rules';
import { InstagramStoriesService } from './instagram-stories.service';

@Injectable()
export class InstagramStoriesCronService {
  private readonly logger = new Logger(InstagramStoriesCronService.name);

  constructor(
    private readonly instagramStoriesService: InstagramStoriesService,
  ) {}

  // Every five minutes, so that the times in INSTAGRAM_STORIES_SCHEDULE
  // (10:00, 15:00 and 18:00 Belgrade time by default) can change without a
  // deploy. A tick outside a slot's 45 minutes does nothing; within them,
  // the slot runs once, and a failed run is tried again 10 and 30 minutes
  // after the slot's time.
  @Cron('*/5 * * * *', {
    name: 'instagram-stories',
    timeZone: POST_TIME_ZONE,
  })
  async publishDueStories(): Promise<void> {
    try {
      await this.instagramStoriesService.publishDueStories();
    } catch (error) {
      this.logger.error(
        'Scheduled Instagram stories failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
