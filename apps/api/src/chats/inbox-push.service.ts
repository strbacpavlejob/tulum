import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import type { ChatMessageRow } from './chats.service';

export const chatRoom = (chatId: string) => `chat:${chatId}`;
/** Every socket of a user joins this room when it connects. */
export const userRoom = (userId: string) => `user:${userId}`;

/**
 * Pushes new messages and inbox changes over the chat socket, so the app
 * hears of a new match or message without polling /matches/mine. A push to
 * a user's room reaches every tab and phone they have open. inbox_changed
 * only says what kind of change it was; the app reads /matches/mine for the
 * rest. Pushes before the socket server is up are dropped.
 */
@Injectable()
export class InboxPushService {
  private server: Server | null = null;

  /** ChatsGateway hands over the socket.io server once it is up. */
  attach(server: Server) {
    this.server = server;
  }

  /** A new message: to everyone in the chat, and to the recipient's inbox. */
  messageSent(
    chatId: string,
    message: Pick<ChatMessageRow, 'id' | 'sender_id' | 'message' | 'sent_at'>,
    recipientId: string,
  ) {
    if (!this.server) return;
    this.server.to(chatRoom(chatId)).emit('new_message', {
      id: message.id,
      chatId,
      senderId: message.sender_id,
      text: message.message,
      sentAt: message.sent_at,
    });
    this.server
      .to(userRoom(recipientId))
      .emit('inbox_changed', { reason: 'message' });
  }

  /** A new match: to both guests' inboxes. */
  matchCreated(guestIds: string[]) {
    if (!this.server) return;
    this.server
      .to(guestIds.map(userRoom))
      .emit('inbox_changed', { reason: 'match' });
  }
}
