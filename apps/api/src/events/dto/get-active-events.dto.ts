import { ApiPropertyOptional } from '@nestjs/swagger';
import type { VenueType } from '../../scrape/interfaces/venue.interface';

const VENUE_TYPES = [
  'bar',
  'pub',
  'nightclub',
  'restaurant',
  'cafe',
  'cocktail_bar',
  'wine_bar',
  'brewery',
  'tavern',
  'raft',
] as const;

export class GetActiveEventsDto {
  @ApiPropertyOptional({ enum: VENUE_TYPES })
  venue_type?: VenueType;

  @ApiPropertyOptional({ description: 'Minimum venue capacity' })
  capacity_min?: string;

  @ApiPropertyOptional({ description: 'Maximum venue capacity' })
  capacity_max?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting on or after this ISO date',
  })
  date_start?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting on or before this ISO date',
  })
  date_end?: string;

  @ApiPropertyOptional({
    description: 'Return only favorited events (requires user_id)',
  })
  only_favorites?: string;

  @ApiPropertyOptional({
    description: 'User ID — required when only_favorites is true',
  })
  user_id?: string;
}
