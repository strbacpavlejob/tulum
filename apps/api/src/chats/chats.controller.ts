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
import { UserId } from '../common/decorators/user-id.decorator';
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

  /**
   * GET /chats/by-match/:matchId
   * Gets or creates the chat for a match, and returns the chat + its message history.
   * Used by mobile to open a conversation.
   */
  @Get('by-match/:matchId')
  async getOrCreateByMatch(
    @Param('matchId', ParseIntPipe) matchId: number,
    @UserId() userId: string,
  ) {
    if (!userId) throw new NotFoundException('Missing x-user-id header');
    const chat = await this.chatsService.getOrCreateChat(matchId);
    const rows = await this.chatsService.getMessages(chat.id as number);
    // Normalize DB column `message` → `text` so mobile ChatMessage type aligns
    const messages = (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      chat_id: r.chat_id,
      sender_id: r.sender_id,
      text: r.message,
      sent_at: r.sent_at,
    }));
    return { chat, messages };
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
