import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ArrayMinSize,
  Matches,
  MaxLength,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { VenueTypeEnum } from '../../scrape/domain/scraper-venue.interfaces';

// The onboarding name field allows the same length
// (apps/mobile/app/(auth)/onboarding.tsx). Change both together.
const FIRST_NAME_MAX_LENGTH = 50;

function IsRealDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isRealDate',
      target: object.constructor,
      propertyName,
      options: {
        message: 'birthday must be a valid date in YYYY-MM-DD format',
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const [y, m, d] = value.split('-').map(Number);
          const date = new Date(y, m - 1, d);
          return (
            date.getFullYear() === y &&
            date.getMonth() === m - 1 &&
            date.getDate() === d
          );
        },
      },
    });
  };
}

/** Tulum is for adults; the app's date picker also stops 18 years back. */
const MIN_AGE = 18;

/** At least MIN_AGE years old today (UTC). IsRealDate reports bad dates. */
function IsOldEnough(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isOldEnough',
      target: object.constructor,
      propertyName,
      options: {
        message: `Tulum is for people aged ${MIN_AGE} or older`,
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
            return true;
          const [y, m, d] = value.split('-').map(Number);
          const now = new Date();
          const month = now.getUTCMonth() + 1;
          const hadBirthday =
            month > m || (month === m && now.getUTCDate() >= d);
          return now.getUTCFullYear() - y - (hadBirthday ? 0 : 1) >= MIN_AGE;
        },
      },
    });
  };
}

export enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum SeekingEnum {
  CASUAL = 'casual',
  RELATIONSHIP = 'relationship',
  FRIENDSHIP = 'friendship',
  PARTY = 'party',
}

export class OnboardingDto {
  @ApiProperty({
    maxLength: FIRST_NAME_MAX_LENGTH,
    description:
      'Saved as first_name on the users row. Surrounding spaces are trimmed.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(FIRST_NAME_MAX_LENGTH)
  first_name!: string;

  @ApiProperty({ enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender!: GenderEnum;

  // The short onboarding leaves it for "Finish your profile" (PATCH
  // /users/me); apps from before it still send it.
  @ApiPropertyOptional({ enum: SeekingEnum })
  @IsOptional()
  @IsEnum(SeekingEnum)
  seeking?: SeekingEnum;

  @ApiProperty({ enum: GenderEnum, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(GenderEnum, { each: true })
  interested_in!: GenderEnum[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  picture_urls?: string[];

  @ApiPropertyOptional({ enum: VenueTypeEnum, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(VenueTypeEnum, { each: true })
  venue_types?: VenueTypeEnum[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ description: 'Date of birth in YYYY-MM-DD format' })
  @IsString()
  @IsRealDate()
  @IsOldEnough()
  birthday!: string;

  // Stored apart from the profile (ConsentsService, AttributionService).

  @ApiPropertyOptional({
    description:
      '"Email me when the Tulum app is out", unticked unless the guest ticked it',
  })
  @IsOptional()
  @IsBoolean()
  launch_email_opt_in?: boolean;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'The text shown next to that checkbox',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  consent_wording?: string;

  @ApiPropertyOptional({ description: "The app's language, e.g. en, sr, ru" })
  @IsOptional()
  @Matches(/^[a-zA-Z-]{2,8}$/)
  language?: string;

  @ApiPropertyOptional({
    description: 'Where the app runs, e.g. web-ios or web-android-instagram',
  })
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,64}$/)
  signup_platform?: string;
}
