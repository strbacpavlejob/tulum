import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateEventSessionDto {
  @ApiProperty({ description: 'The event to check in to', format: 'uuid' })
  @IsUUID()
  event_id!: string;

  @ApiProperty({
    description:
      "The guest's latitude, read on the phone just before. It is checked against the venue and not stored.",
    example: 44.8176,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({
    description: "The guest's longitude, read with the latitude.",
    example: 20.4569,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({
    description:
      "The position's accuracy in metres, as the phone reports it. It is allowed for, up to the check-in radius.",
    required: false,
    example: 35,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;
}
