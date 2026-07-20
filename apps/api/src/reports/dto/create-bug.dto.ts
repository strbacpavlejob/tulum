import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateBugDto {
  @ApiProperty({ description: 'Short description of the bug' })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Optional additional info (stack trace, device)',
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
