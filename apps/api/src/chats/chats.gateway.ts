import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { createClerkClient } from '@clerk/backend';
import { isUUID } from 'class-validator';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { verifySessionUserId } from '../common/clerk-session';
import { ChatsService } from './chats.service';

/** data.userId is the Clerk user verified in the handshake. */
type ChatSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  { userId: string }
>;

const chatRoom = (chatId: string) => `chat:${chatId}`;

// The global ClerkAuthGuard does not authenticate sockets. Every connection
// is authenticated here, in the handshake, and each event only reaches chats
// whose match the user is a guest of.
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class ChatsGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  });

  constructor(private readonly chatsService: ChatsService) {}

  afterInit(server: Server) {
    // socket.io runs this before it accepts the connection, so no event is
    // handled until the token is verified. A refused client gets a
    // connect_error with the reason.
    server.use((client: ChatSocket, next) => {
      this.authenticate(client).then(
        (userId) => {
          client.data.userId = userId;
          next();
        },
        (err: Error) => next(err),
      );
    });
  }

  handleDisconnect(_client: Socket) {
    // nothing to clean up — rooms are per-connection
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: { chatId: string },
  ) {
    const chatId = await this.assertParticipant(client, payload?.chatId);
    await client.join(chatRoom(chatId));
    return { event: 'joined', data: { chatId } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: { chatId: string; text: string },
  ) {
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!text) return;
    // Checked on every send, like POST /chats/messages, so a chat deleted by
    // the expiry cleanup stops taking messages.
    const chatId = await this.assertParticipant(client, payload.chatId);

    const row = await this.chatsService.createMessage({
      chat_id: chatId,
      sender_id: client.data.userId,
      message: text,
    });

    this.server.to(chatRoom(chatId)).emit('new_message', {
      id: row.id,
      chatId,
      senderId: row.sender_id,
      text: row.message,
      sentAt: row.sent_at,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: { chatId: string; isTyping: boolean },
  ) {
    // Typing fires on every keystroke, so it is not checked against the
    // database: only a socket that passed join_chat's check is in the room.
    const room = chatRoom(payload?.chatId);
    if (!client.rooms.has(room)) throw new WsException('Join the chat first');
    client.to(room).emit('user_typing', {
      userId: client.data.userId,
      isTyping: payload.isTyping === true,
    });
  }

  /**
   * The user id of the Clerk session token the client sent as
   * `auth: { token }`, or a 401. A userId in `auth` and the x-user-id header
   * are ignored: any client can set them.
   */
  private async authenticate(client: ChatSocket): Promise<string> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Missing session token');
    }

    try {
      // Clerk checks a Web Fetch API Request, as ClerkAuthGuard does for HTTP.
      const { headers, secure, url } = client.handshake;
      const request = new Request(
        `${secure ? 'https' : 'http'}://${headers.host ?? 'localhost'}${url}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      return await verifySessionUserId(this.clerkClient, request);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * The chat id, if the socket's user is one of the two guests of the chat's
   * match. Anyone else gets the same 'Chat not found' as from the REST
   * routes, so chat ids can't be probed.
   */
  private async assertParticipant(
    client: ChatSocket,
    chatId: unknown,
  ): Promise<string> {
    if (typeof chatId !== 'string' || !isUUID(chatId)) {
      throw new WsException('Chat not found');
    }
    try {
      await this.chatsService.getChatForParticipant(chatId, client.data.userId);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw new WsException('Chat not found');
      }
      throw err;
    }
    return chatId;
  }
}
