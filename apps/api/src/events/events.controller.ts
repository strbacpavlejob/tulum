import { Body, Controller, Delete, Get } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstagramPostService } from '../instagram/instagram-post.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CleanupEventsDto } from './dto/cleanup-events.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly instagramPostService: InstagramPostService,
  ) {}

  @Get('preview-posts')
  @ApiOperation({
    summary: "Preview this week's event posts as base64 images",
    description:
      'Fetches all active events happening this week from Supabase, renders each as a 1080×1080 Instagram-style JPEG using Canvas, and returns them as base64-encoded strings.',
  })
  @ApiOkResponse({
    description: "Base64-encoded post preview images for this week's events",
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 3 },
        previews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventId: { type: 'number', example: 42 },
              title: { type: 'string', example: 'Saturday Night Party' },
              startDateTime: {
                type: 'string',
                example: '2026-04-18T22:00:00.000Z',
              },
              venue: { type: 'string', example: 'Club Tropicana' },
              imageBase64: {
                type: 'string',
                description:
                  'JPEG image encoded as base64. Render with: <img src="data:image/jpeg;base64,{imageBase64}"/>',
              },
            },
          },
        },
      },
    },
  })
  async previewPosts() {
    const rows = await this.supabaseService.getThisWeekEventsWithVenues();

    const previews = await Promise.all(
      rows.map(async (row) => {
        const dbRow = row as {
          id: number;
          title: string;
          start_date_time: string;
          tags?: string[];
          picture_url?: string;
          venues?: { name?: string; address?: string; picture_url?: string };
        };

        const imageBase64 =
          await this.instagramPostService.previewPostAsBase64(dbRow);

        return {
          eventId: dbRow.id,
          title: dbRow.title,
          startDateTime: dbRow.start_date_time,
          venue: dbRow.venues?.name ?? 'Unknown venue',
          imageBase64,
        };
      }),
    );

    return { count: previews.length, previews };
  }

  @Delete('cleanup')
  @ApiOperation({
    summary: 'Delete past events',
    description:
      'Deletes events whose end_date_time is older than now, or older than a provided cutoff date.',
  })
  @ApiBody({
    type: CleanupEventsDto,
    required: false,
  })
  @ApiOkResponse({
    description: 'Number of deleted events',
    schema: {
      example: {
        deleted: 7,
      },
    },
  })
  async cleanup(@Body() body?: CleanupEventsDto) {
    const deleted = await this.supabaseService.deleteOldEvents(body?.before);
    return { deleted };
  }
}
