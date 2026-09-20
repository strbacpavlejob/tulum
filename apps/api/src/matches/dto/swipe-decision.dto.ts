import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsUUID } from 'class-validator';

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
    description: 'true for like, false for dislike',
  })
  @IsBoolean()
  liked!: boolean;
}
