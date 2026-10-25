import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBlockDto {
  @ApiProperty({
    description:
      'The guest to block. The block works both ways and the app offers no unblock.',
    example: 'user_2xA91',
  })
  @IsString()
  @IsNotEmpty()
  user_id!: string;
}
