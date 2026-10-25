import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// The reasons the app's report sheet offers (apps/mobile/components/
// GuestSafetySheet.tsx) and the guest_reports_reason_check constraint
// allows. Change all three together.
export const GUEST_REPORT_REASONS = [
  'harassment',
  'inappropriate',
  'fake_profile',
  'spam',
  'underage',
  'unsafe_meeting',
  'other',
] as const;

export type GuestReportReason = (typeof GUEST_REPORT_REASONS)[number];

/** Where the report was made: a guest's profile, or a chat with a match. */
export const GUEST_REPORT_SOURCES = ['profile', 'chat'] as const;

export type GuestReportSource = (typeof GUEST_REPORT_SOURCES)[number];

export const GUEST_REPORT_DETAILS_MAX_LENGTH = 1000;

export class CreateGuestReportDto {
  @ApiProperty({ description: 'The guest being reported.' })
  @IsString()
  @IsNotEmpty()
  reported_user_id!: string;

  @ApiProperty({ enum: GUEST_REPORT_REASONS })
  @IsIn(GUEST_REPORT_REASONS)
  reason!: GuestReportReason;

  @ApiProperty({ enum: GUEST_REPORT_SOURCES })
  @IsIn(GUEST_REPORT_SOURCES)
  source!: GuestReportSource;

  @ApiPropertyOptional({
    maxLength: GUEST_REPORT_DETAILS_MAX_LENGTH,
    description:
      'What happened, in the reporter’s words. Surrounding spaces are trimmed. Required when the reason is other.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @ValidateIf(
    (dto: CreateGuestReportDto, value: unknown) =>
      dto.reason === 'other' || (value !== undefined && value !== null),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(GUEST_REPORT_DETAILS_MAX_LENGTH)
  details?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'The event the guest was reported at (the deck’s event). A chat report takes the match’s event instead.',
  })
  @IsOptional()
  @IsUUID()
  event_id?: string | null;

  @ApiPropertyOptional({
    description:
      'The match whose chat the report comes from. Required from a chat; the report keeps a copy of the chat’s last messages.',
  })
  @ValidateIf(
    (dto: CreateGuestReportDto, value: unknown) =>
      dto.source === 'chat' || (value !== undefined && value !== null),
  )
  @IsInt()
  @Min(1)
  match_id?: number | null;
}
