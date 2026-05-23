import { Body, Controller, Delete, Get } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseService } from '../supabase/supabase.service';
import { CleanupEventsDto } from './dto/cleanup-events.dto';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly supabaseService: SupabaseService) {}

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
