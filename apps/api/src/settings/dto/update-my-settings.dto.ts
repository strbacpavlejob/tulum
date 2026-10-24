import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { VenueTypeEnum } from '../../scrape/domain/scraper-venue.interfaces';

// The values the app's Settings offer (apps/mobile/types/settings.ts). The
// language and theme lists match the database enums, with RS stored as SR.
const LANGUAGES = ['EN', 'RS', 'RU'] as const;
const THEMES = ['light', 'dark', 'system'] as const;

/** The settings a user may change; each field is optional. */
export class UpdateMySettingsDto {
  @ApiPropertyOptional({ enum: LANGUAGES })
  @IsOptional()
  @IsIn(LANGUAGES)
  language?: (typeof LANGUAGES)[number];

  @ApiPropertyOptional({ enum: THEMES })
  @IsOptional()
  @IsIn(THEMES)
  theme?: (typeof THEMES)[number];

  /** null clears the choice. */
  @ApiPropertyOptional({ enum: VenueTypeEnum, nullable: true })
  @IsOptional()
  @IsEnum(VenueTypeEnum)
  default_venue_type?: VenueTypeEnum | null;
}
