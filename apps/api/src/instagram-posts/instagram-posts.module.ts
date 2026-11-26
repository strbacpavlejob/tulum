import { Module } from '@nestjs/common';
import { R2Module } from '../r2/r2.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersModule } from '../users/users.module';
import { InstagramGraphService } from './instagram-graph.service';
import { InstagramPostsController } from './instagram-posts.controller';
import { InstagramPostsCronService } from './instagram-posts-cron.service';
import { InstagramPostsDataService } from './instagram-posts-data.service';
import { InstagramPostsService } from './instagram-posts.service';
import { InstagramStoriesController } from './instagram-stories.controller';
import { InstagramStoriesCronService } from './instagram-stories-cron.service';
import { InstagramStoriesService } from './instagram-stories.service';
import { PublicationHistoryService } from './publication-history.service';

@Module({
  imports: [SupabaseModule, R2Module, UsersModule],
  controllers: [InstagramPostsController, InstagramStoriesController],
  providers: [
    InstagramPostsService,
    InstagramPostsDataService,
    InstagramGraphService,
    InstagramPostsCronService,
    InstagramStoriesService,
    InstagramStoriesCronService,
    PublicationHistoryService,
  ],
})
export class InstagramPostsModule {}
