import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatsService } from './chats.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatsService: ChatsService) {}

  handleConnection(client: Socket) {
    const userId =
      (client.handshake.auth?.userId as string | undefined) ||
      (client.handshake.headers?.['x-user-id'] as string | undefined);

    if (!userId) {
      client.emit('error', { message: 'Missing userId in handshake auth' });
      client.disconnect();
      return;
    }

    client.data.userId = userId;
  }

  handleDisconnect(_client: Socket) {
    // nothing to clean up — rooms are per-connection
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: number },
  ) {
    client.join(`chat:${payload.chatId}`);
    return { event: 'joined', data: { chatId: payload.chatId } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: number; text: string },
  ) {
    const userId = client.data.userId as string;
    if (!userId || !payload?.text?.trim()) return;

    const row = await this.chatsService.createMessage({
      chat_id: payload.chatId,
      sender_id: userId,
      message: payload.text.trim(),
    });

    this.server.to(`chat:${payload.chatId}`).emit('new_message', {
      id: row.id,
      chatId: payload.chatId,
      senderId: row.sender_id,
      text: row.message,
      sentAt: row.sent_at,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: number; isTyping: boolean },
  ) {
    const userId = client.data.userId as string;
    client.to(`chat:${payload.chatId}`).emit('user_typing', {
      userId,
      isTyping: payload.isTyping,
    });
  }
}
