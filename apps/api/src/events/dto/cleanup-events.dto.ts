import { ApiPropertyOptional } from '@nestjs/swagger';

export class CleanupEventsDto {
  @ApiPropertyOptional({
    description:
      'Delete events with end_date_time older than this ISO date-time. Defaults to current date-time when omitted.',
    example: '2026-04-13T00:00:00.000Z',
  })
  before?: string;
}
