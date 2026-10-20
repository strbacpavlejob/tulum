import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { ChatsService } from './chats.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';

// Reads and message writes are limited to the two guests of the chat's
// match; the service answers 404 for everyone else.
@ApiTags('chats')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  async getChat(
    @UserId() userId: string,
    @Query('id') id?: string,
    @Query('match_id') matchId?: string,
  ) {
    if (id) return this.chatsService.getChatForParticipant(id, userId);
    if (matchId) {
      const parsedMatchId = parseInt(matchId, 10);
      await this.chatsService.assertMatchParticipant(parsedMatchId, userId);
      return this.chatsService.getChatByMatchId(parsedMatchId);
    }
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
    await this.chatsService.assertMatchParticipant(matchId, userId);
    const chat = await this.chatsService.getOrCreateChat(matchId);
    const rows = await this.chatsService.getMessages(chat.id as string);
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
  @UseGuards(AdminGuard)
  async createChat(@Body() chat: Record<string, unknown>) {
    return this.chatsService.createChat(chat);
  }

  @Delete()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteChat(@Query('id', ParseUUIDPipe) id: string) {
    await this.chatsService.deleteChat(id);
    return { success: true };
  }

  // ── Messages ──────────────────────────────────────────────────────────

  @Get('messages')
  async getMessages(
    @UserId() userId: string,
    @Query('chat_id', ParseUUIDPipe) chatId: string,
  ) {
    await this.chatsService.getChatForParticipant(chatId, userId);
    return this.chatsService.getMessages(chatId);
  }

  @Post('messages')
  async createMessage(
    @UserId() userId: string,
    @Body() body: CreateChatMessageDto,
  ) {
    if (body.sender_id && body.sender_id !== userId) {
      throw new ForbiddenException('sender_id must be the signed-in user');
    }
    await this.chatsService.getChatForParticipant(body.chat_id, userId);
    return this.chatsService.createMessage({
      chat_id: body.chat_id,
      sender_id: userId,
      message: body.message,
    });
  }

  @Patch('messages')
  async markMessageRead(
    @UserId() userId: string,
    @Body('message_id', ParseUUIDPipe) messageId: string,
  ) {
    return this.chatsService.markMessageRead(messageId, userId);
  }

  @Delete('messages')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Query('id', ParseUUIDPipe) id: string) {
    await this.chatsService.deleteMessage(id);
    return { success: true };
  }
}
