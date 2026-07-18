import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateVenueSuggestionDto {
  @ApiProperty({ description: 'Suggested venue name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Instagram handle without @' })
  @IsOptional()
  @IsString()
  instagram_handle?: string;

  @ApiPropertyOptional({ description: 'Additional info about the venue' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
