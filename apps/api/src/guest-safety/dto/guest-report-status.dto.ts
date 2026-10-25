import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

// The report_status_enum values the admin review uses: still to look at,
// being looked at, handled (action taken) or rejected (nothing wrong).
export const GUEST_REPORT_STATUSES = [
  'pending',
  'in_review',
  'resolved',
  'rejected',
] as const;

export type GuestReportStatus = (typeof GUEST_REPORT_STATUSES)[number];

/** Query of GET /reports/guests. */
export class ListGuestReportsQueryDto {
  @ApiPropertyOptional({
    enum: GUEST_REPORT_STATUSES,
    description: 'Only reports with this status; all of them when left out.',
  })
  @IsOptional()
  @IsIn(GUEST_REPORT_STATUSES)
  status?: GuestReportStatus;
}

/** Body of PATCH /reports/guests/:id. */
export class UpdateGuestReportDto {
  @ApiProperty({ enum: GUEST_REPORT_STATUSES })
  @IsIn(GUEST_REPORT_STATUSES)
  status!: GuestReportStatus;
}
