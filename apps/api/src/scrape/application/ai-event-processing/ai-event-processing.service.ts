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
  private readonly timezone = 'Europe/Belgrade';

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  async processEvents<T extends InstagramEvent>(events: T[]): Promise<T[]> {
    if (!events.length) {
      return [];
    }

    /**
     * Keep the absolute current instant as ISO UTC.
     *
     * Example:
     * 2026-09-20T13:15:00.000Z
     *
     * The prompt explicitly tells the model NOT to use this UTC representation
     * to shift event times extracted from Instagram.
     */
    const currentDate = new Date().toISOString();

    /**
     * Also provide the current local date/time in the venue timezone.
     *
     * This helps the model reason about "today", "tonight", past/upcoming
     * events, etc. without having to infer the local calendar date from UTC.
     */
    const currentLocalDateTime = this.getLocalDateTime(
      new Date(),
      this.timezone,
    );

    const input: OpenAI.Responses.ResponseInput = events.map(
      (event, index) => ({
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: JSON.stringify({
              index,
              // Absolute current instant.
              currentDate,
              // Current wall-clock date/time at the venue.
              currentLocalDateTime,
              // Instagram publication date/time.
              postDate: event.postDate ?? null,

              /**
               * IMPORTANT:
               * Times visible in the Instagram post/image are interpreted
               * as local wall-clock times in this timezone.
               */
              timezone: this.timezone,

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

  /**
   * Returns a wall-clock representation of a date in a specific timezone.
   *
   * Example for Europe/Belgrade:
   *
   * 2026-09-20 15:15:30
   *
   * This is provided to the AI only as additional date-resolution context.
   * It is NOT used to transform extracted event times.
   */
  private getLocalDateTime(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}
