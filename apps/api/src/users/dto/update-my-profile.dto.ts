import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OnboardingDto } from '../../guests/dto/onboarding.dto';

// The choices the app's profile editors offer
// (apps/mobile/constants/options.ts). Change both together.
const HABITS = ['never', 'socially', 'regularly', 'prefer not to say'];
const CHILDREN = ['no', 'yes', 'prefer not to say'];
const RELATIONSHIP_STATUSES = [
  'single',
  'divorced',
  'separated',
  'prefer not to say',
];
const SEXUALITIES = ['straight', 'gay', 'bisexual', 'prefer not to say'];
const STAR_SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];
const RELIGIONS = [
  'atheist',
  'agnostic',
  'christian',
  'muslim',
  'jewish',
  'buddhist',
  'hindu',
  'other',
  'prefer not to say',
];
const LANGUAGES = [
  'English',
  'Serbian',
  'Russian',
  'Spanish',
  'French',
  'German',
];
const PETS = ['cat', 'dog', 'fish', 'bird', 'none'];

/**
 * Validates the field whenever it was sent. Unlike IsOptional, null is not
 * let through, because the list columns are NOT NULL.
 */
const IfSent = () => ValidateIf((_, value) => value !== undefined);

/** The users-row fields a user may change about themselves. */
export class UpdateMyUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;
}

/**
 * Guest fields follow the onboarding rules, but each one is optional. The
 * profile details below are not asked during onboarding. null clears a
 * single value; an empty list clears a list.
 */
export class UpdateMyGuestDto extends PartialType(OnboardingDto) {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  work?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  education?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 50, maximum: 300 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(300)
  height_cm?: number | null;

  @ApiPropertyOptional({ enum: CHILDREN, nullable: true })
  @IsOptional()
  @IsIn(CHILDREN)
  has_children?: string | null;

  @ApiPropertyOptional({ enum: HABITS, nullable: true })
  @IsOptional()
  @IsIn(HABITS)
  drinking?: string | null;

  @ApiPropertyOptional({ enum: HABITS, nullable: true })
  @IsOptional()
  @IsIn(HABITS)
  smoking?: string | null;

  @ApiPropertyOptional({ enum: LANGUAGES, isArray: true })
  @IfSent()
  @IsArray()
  @IsIn(LANGUAGES, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ enum: RELATIONSHIP_STATUSES, nullable: true })
  @IsOptional()
  @IsIn(RELATIONSHIP_STATUSES)
  relationship_status?: string | null;

  @ApiPropertyOptional({ enum: SEXUALITIES, nullable: true })
  @IsOptional()
  @IsIn(SEXUALITIES)
  sexuality?: string | null;

  @ApiPropertyOptional({ enum: STAR_SIGNS, nullable: true })
  @IsOptional()
  @IsIn(STAR_SIGNS)
  star_sign?: string | null;

  @ApiPropertyOptional({ enum: PETS, isArray: true })
  @IfSent()
  @IsArray()
  @IsIn(PETS, { each: true })
  pets?: string[];

  @ApiPropertyOptional({ enum: RELIGIONS, nullable: true })
  @IsOptional()
  @IsIn(RELIGIONS)
  religion?: string | null;
}

/**
 * Body of PATCH /users/me. The global ValidationPipe whitelist drops every
 * other field, so is_admin, push_token, email or another user_id are never
 * written.
 */
export class UpdateMyProfileDto {
  @ApiPropertyOptional({ type: UpdateMyUserDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMyUserDto)
  user?: UpdateMyUserDto;

  @ApiPropertyOptional({ type: UpdateMyGuestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateMyGuestDto)
  guest?: UpdateMyGuestDto;
}
