import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVenueSuggestionDto {
  @ApiProperty({
    description:
      'Suggested venue name. Surrounding spaces are trimmed, and a blank name is refused.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description:
      'Instagram handle without @. Leading @ signs and surrounding spaces are removed; an empty handle is saved as none.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().replace(/^@+/, '').trim() || undefined
      : value,
  )
  @IsOptional()
  @IsString()
  instagram_handle?: string;

  @ApiPropertyOptional({ description: 'Additional info about the venue' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
