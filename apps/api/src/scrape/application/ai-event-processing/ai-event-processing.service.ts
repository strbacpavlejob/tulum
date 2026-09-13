import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  AiEventResult,
  AiEventResultSchema,
} from './schemas/ai-event-result.schema';

import { EVENT_PROCESSING_PROMPT } from './prompts/event-processing.prompt';

type InstagramEvent = {
  venue?: {
    name?: string;
    venueType?: string;
    address?: string;
  };

  title?: string;
  description?: string;
  tags?: string[];

  imageUrl?: string;

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

    const input: OpenAI.Responses.ResponseInput = events.map(
      (event, index) => ({
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify({
              index,

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
                  detail: 'high' as const,
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
        format: zodTextFormat(AiEventResultSchema, 'instagram_events'),
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

    for (const aiEvent of result.events) {
      const originalEvent = events[aiEvent.index];

      if (!originalEvent) {
        this.logger.warn(`AI returned invalid index ${aiEvent.index}`);

        continue;
      }

      if (!aiEvent.isEvent) {
        this.logger.debug(`Filtered "${originalEvent.title ?? 'unknown'}"`);

        continue;
      }

      processedEvents.push({
        ...originalEvent,

        title: aiEvent.title ?? originalEvent.title,

        description: aiEvent.description ?? originalEvent.description,

        tags:
          aiEvent.tags.length > 0 ? aiEvent.tags : (originalEvent.tags ?? []),
      });
    }

    return processedEvents;
  }
}
