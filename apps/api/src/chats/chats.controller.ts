import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatsService } from './chats.service';

@ApiTags('chats')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async getChat(@Query('id') id?: string, @Query('match_id') matchId?: string) {
    if (id) return this.chatsService.getChatById(parseInt(id, 10));
    if (matchId)
      return this.chatsService.getChatByMatchId(parseInt(matchId, 10));
    throw new NotFoundException('Missing required parameter: id or match_id');
  }

  @Post()
  async createChat(@Body() chat: Record<string, unknown>) {
    return this.chatsService.createChat(chat);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteChat(@Query('id', ParseIntPipe) id: number) {
    await this.chatsService.deleteChat(id);
    return { success: true };
  }

  // ── Messages ──────────────────────────────────────────────────────────

  @Get('messages')
  async getMessages(@Query('chat_id', ParseIntPipe) chatId: number) {
    return this.chatsService.getMessages(chatId);
  }

  @Post('messages')
  async createMessage(@Body() message: Record<string, unknown>) {
    return this.chatsService.createMessage(message);
  }

  @Patch('messages')
  async markMessageRead(@Body('message_id', ParseIntPipe) messageId: number) {
    return this.chatsService.markMessageRead(messageId);
  }

  @Delete('messages')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Query('id', ParseIntPipe) id: number) {
    await this.chatsService.deleteMessage(id);
    return { success: true };
  }
}
