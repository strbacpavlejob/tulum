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

  @ApiPropertyOptional({
    description: 'Return only favorited events (requires user_id)',
  })
  @IsOptional()
  @IsString()
  only_favorites?: string;

  @ApiPropertyOptional({
    description: 'User ID — required when only_favorites is true',
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}
