import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * The guest's answer to "Email me when the Tulum app is out", with what the
 * app showed them, so the consent can be shown later as it was given.
 */
export class AppLaunchConsentDto {
  @ApiProperty()
  @IsBoolean()
  granted!: boolean;

  @ApiProperty({
    maxLength: 500,
    description: 'The text next to the checkbox, as shown to the guest.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  wording!: string;

  @ApiPropertyOptional({ description: "The app's language, e.g. en, sr, ru" })
  @IsOptional()
  @Matches(/^[a-zA-Z-]{2,8}$/)
  language?: string;

  @ApiPropertyOptional({
    description: 'Where the app runs, e.g. web-ios or web-android-instagram',
  })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,64}$/)
  platform?: string;
}
