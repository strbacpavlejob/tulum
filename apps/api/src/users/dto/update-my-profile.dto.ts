import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { OnboardingDto } from '../../guests/dto/onboarding.dto';

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

/** Guest fields follow the onboarding rules, but each one is optional. */
export class UpdateMyGuestDto extends PartialType(OnboardingDto) {}

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
