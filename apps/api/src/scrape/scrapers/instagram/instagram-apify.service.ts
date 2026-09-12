import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApifyClient } from 'apify-client';

export interface InstagramPost {
  id: string;
  type: string;
  shortCode?: string;
  caption?: string;
  url: string;
  displayUrl?: string;
  timestamp?: string;
  ownerUsername?: string;
  ownerId?: string;
  likesCount?: number;
  commentsCount?: number;
}

@Injectable()
export class InstagramApifyService {
  private readonly logger = new Logger(InstagramApifyService.name);

  private readonly client: ApifyClient;

  constructor(private readonly configService: ConfigService) {
    this.client = new ApifyClient({
      token: this.configService.getOrThrow<string>('APIFY_API_TOKEN'),
    });
  }

  async fetchPosts(instagramHandles: string[]): Promise<InstagramPost[]> {
    if (!instagramHandles.length) {
      return [];
    }

    const directUrls = instagramHandles.map(
      (handle) => `https://www.instagram.com/${handle}/`,
    );

    this.logger.log(
      `Running Apify Instagram bulk scrape for ${directUrls.length} profiles`,
    );

    const run = await this.client.actor('apify/instagram-scraper').call({
      directUrls,
      resultsType: 'posts',
      resultsLimit: 10,
      onlyPostsNewerThan: '7 days',
    });

    if (!run.defaultDatasetId) {
      this.logger.warn('Apify run did not return a dataset id.');
      return [];
    }

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems();

    this.logger.log(`Apify returned ${items.length} Instagram posts`);

    return items
      .map((item) => this.toInstagramPost(item))
      .filter((item): item is InstagramPost => item !== null);
  }

  private toInstagramPost(
    item: Record<string | number, unknown>,
  ): InstagramPost | null {
    const id = typeof item.id === 'string' ? item.id : null;
    const type = typeof item.type === 'string' ? item.type : null;
    const url = typeof item.url === 'string' ? item.url : null;

    if (!id || !type || !url) {
      return null;
    }

    return {
      id,
      type,
      url,
      shortCode:
        typeof item.shortCode === 'string' ? item.shortCode : undefined,
      caption: typeof item.caption === 'string' ? item.caption : undefined,
      displayUrl:
        typeof item.displayUrl === 'string' ? item.displayUrl : undefined,
      timestamp:
        typeof item.timestamp === 'string' ? item.timestamp : undefined,
      ownerUsername:
        typeof item.ownerUsername === 'string' ? item.ownerUsername : undefined,
      ownerId: typeof item.ownerId === 'string' ? item.ownerId : undefined,
      likesCount:
        typeof item.likesCount === 'number' ? item.likesCount : undefined,
      commentsCount:
        typeof item.commentsCount === 'number' ? item.commentsCount : undefined,
    };
  }
}
