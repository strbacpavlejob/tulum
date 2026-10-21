import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBugDto {
  @ApiProperty({
    description:
      'Short description of the bug. Surrounding spaces are trimmed, and a blank description is refused.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'Optional additional info (stack trace, device)',
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
