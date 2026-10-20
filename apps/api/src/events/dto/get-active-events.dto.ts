import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
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
  @IsOptional()
  @IsString()
  venue_type?: VenueType;

  @ApiPropertyOptional({ description: 'Minimum venue capacity' })
  @IsOptional()
  @IsNumberString()
  capacity_min?: string;

  @ApiPropertyOptional({ description: 'Maximum venue capacity' })
  @IsOptional()
  @IsNumberString()
  capacity_max?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting on or after this ISO date',
  })
  @IsOptional()
  @IsISO8601()
  date_start?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting on or before this ISO date',
  })
  @IsOptional()
  @IsISO8601()
  date_end?: string;

  // There is deliberately no user_id parameter: the caller comes from the
  // Bearer token, so nobody can read another user's favorites.
  @ApiPropertyOptional({
    description:
      "Return only the signed-in caller's favorited events (needs a Bearer token)",
  })
  @IsOptional()
  @IsString()
  only_favorites?: string;
}
