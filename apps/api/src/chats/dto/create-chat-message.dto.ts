import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  chat_id!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({
    description:
      'Optional. The sender is always the signed-in user; a different id is rejected.',
  })
  @IsOptional()
  @IsString()
  sender_id?: string;
}
