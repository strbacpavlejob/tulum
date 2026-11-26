import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { POST_TIME_ZONE } from './instagram-post-rules';
import { InstagramPostsService } from './instagram-posts.service';

@Injectable()
export class InstagramPostsCronService {
  private readonly logger = new Logger(InstagramPostsCronService.name);

  constructor(private readonly instagramPostsService: InstagramPostsService) {}

  // Belgrade time: at 18:05, after the day's scrape and picture jobs, then
  // every hour until 21:05 in case a run fails. A day's post goes out once;
  // the runs after it find it recorded and stop.
  @Cron('5 18-21 * * *', {
    name: 'instagram-posts-daily',
    timeZone: POST_TIME_ZONE,
  })
  async publishScheduledPost(): Promise<void> {
    try {
      const run = await this.instagramPostsService.publishScheduledPost();
      if (run.outcome === 'not-configured') {
        this.logger.log(
          `Instagram ${run.kind} post for ${run.date} skipped: INSTAGRAM_ACCESS_TOKEN is not set`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Scheduled Instagram post failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
