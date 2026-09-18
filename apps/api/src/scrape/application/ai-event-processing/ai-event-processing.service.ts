import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  AiEventResult,
  AiEventResultSchema,
} from './schemas/ai-event-result.schema';

import { EVENT_PROCESSING_PROMPT } from './prompts/event-processing.prompt';

export type InstagramEvent = {
  venue?: {
    name?: string;
    venueType?: string;
    address?: string;
  };

  title?: string;
  description?: string;
  tags?: string[];
  imageUrl?: string;
  postDate?: string;
  startDateTime?: string;
  endDateTime?: string;

  [key: string]: unknown;
};

@Injectable()
export class AiEventProcessingService {
  private readonly logger = new Logger(AiEventProcessingService.name);

  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async processEvents<T extends InstagramEvent>(events: T[]): Promise<T[]> {
    if (!events.length) {
      return [];
    }

    const currentDate = new Date().toISOString();

    const input: OpenAI.Responses.ResponseInput = events.map(
      (event, index) => ({
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify({
              index,
              currentDate,
              postDate: event.postDate ?? null,
              timezone: 'Europe/Belgrade',
              venue: {
                name: event.venue?.name ?? '',
                venueType: event.venue?.venueType ?? '',
                address: event.venue?.address ?? '',
              },
              title: event.title ?? '',
              description: event.description ?? '',
            }),
          },

          ...(event.imageUrl
            ? [
                {
                  type: 'input_image' as const,
                  image_url: event.imageUrl,
                  detail: 'low' as const,
                },
              ]
            : []),
        ],
      }),
    );

    const response = await this.openai.responses.parse({
      model:
        this.configService.get<string>('OPENAI_EVENT_PROCESSING_MODEL') ??
        'gpt-5.6',
      instructions: EVENT_PROCESSING_PROMPT,
      input,
      text: {
        format: zodTextFormat(
          AiEventResultSchema,
          'instagram_event_processing',
        ),
      },
    });

    if (!response.output_parsed) {
      this.logger.warn('AI returned no parsed event result.');
      return events;
    }

    return this.applyResult(events, response.output_parsed);
  }

  private applyResult<T extends InstagramEvent>(
    events: T[],
    result: AiEventResult,
  ): T[] {
    const processedEvents: T[] = [];

    for (const aiPost of result.posts) {
      const originalEvent = events[aiPost.index];

      if (!originalEvent) {
        this.logger.warn(`AI returned invalid index ${aiPost.index}`);
        continue;
      }

      if (!aiPost.isEvent || aiPost.events.length === 0) {
        this.logger.debug(`Filtered "${originalEvent.title ?? 'unknown'}"`);
        continue;
      }

      for (const aiEvent of aiPost.events) {
        processedEvents.push({
          ...originalEvent,
          title: aiEvent.title,
          description: aiEvent.description,
          tags:
            aiEvent.tags.length > 0 ? aiEvent.tags : (originalEvent.tags ?? []),
          startDateTime: aiEvent.startDateTime ?? originalEvent.startDateTime,
          endDateTime: aiEvent.endDateTime ?? originalEvent.endDateTime,
        });
      }
    }

    return processedEvents;
  }
}
