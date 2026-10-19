import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class SwipeDecisionDto {
  @ApiProperty({
    description: 'The user being swiped on',
    example: 'user_2xA91',
  })
  @IsString()
  other_user_id!: string;

  @ApiProperty({
    description: 'Event where the swipe happened',
    format: 'uuid',
  })
  @IsUUID()
  event_id!: string;

  @ApiProperty({
    description:
      'true for like, false for dislike. A like is final: a later dislike of the same guest at the same event is rejected.',
  })
  @IsBoolean()
  liked!: boolean;

  @ApiProperty({
    description:
      'Current gender filter for eligible-guest like limit calculation',
    required: false,
    enum: ['male', 'female', 'other', 'everyone'],
  })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'everyone'])
  gender_filter?: 'male' | 'female' | 'other' | 'everyone';

  @ApiProperty({
    description: 'Current minimum age filter used for like-limit calculation',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age_min?: number;

  @ApiProperty({
    description: 'Current maximum age filter used for like-limit calculation',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age_max?: number;

  @ApiProperty({
    description:
      'Current selected interests used for like-limit calculation (OR matching)',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selected_interests?: string[];
}
