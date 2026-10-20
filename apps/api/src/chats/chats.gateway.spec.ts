import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { describe, expect, it, jest } from '@jest/globals';
import type { Server } from 'socket.io';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

const VALID_TOKEN = 'valid-session-token';
const CALLER = 'user_caller';
const OTHER = 'user_other';
const CHAT_ID = '0b6c3f0e-5f8e-4a3e-9d7a-1c2b3d4e5f60';
const ROOM = `chat:${CHAT_ID}`;

type Middleware = (socket: FakeSocket, next: (err?: Error) => void) => void;

type FakeSocket = ReturnType<typeof fakeSocket>;

function fakeSocket({
  auth = {},
  headers = {},
  rooms = [],
}: {
  auth?: Record<string, unknown>;
  headers?: Record<string, string>;
  rooms?: string[];
} = {}) {
  const emitToOthers = jest.fn();
  return {
    handshake: {
      auth,
      headers: { host: 'localhost:3001', ...headers },
      url: '/socket.io/?EIO=4&transport=websocket',
      secure: false,
    },
    data: {} as { userId?: string },
    rooms: new Set(rooms),
    join: jest.fn(),
    to: jest.fn(() => ({ emit: emitToOthers })),
    emitToOthers,
  };
}

/** A socket that passed the handshake as CALLER. */
function callerSocket(rooms: string[] = []) {
  const socket = fakeSocket({ rooms });
  socket.data.userId = CALLER;
  return socket;
}

function createGateway() {
  const chatsService = {
    // Only CALLER and OTHER are guests of the match behind CHAT_ID.
    getChatForParticipant: jest.fn((chatId: string, userId: string) =>
      chatId === CHAT_ID && [CALLER, OTHER].includes(userId)
        ? Promise.resolve({ id: CHAT_ID, match_id: 7 })
        : Promise.reject(new NotFoundException('Chat not found')),
    ),
    createMessage: jest.fn((row: Record<string, unknown>) =>
      Promise.resolve({
        id: 'message-1',
        sent_at: '2026-10-20T10:00:00Z',
        ...row,
      }),
    ),
  };
  const gateway = new ChatsGateway(chatsService as unknown as ChatsService);

  // Stands in for Clerk: only VALID_TOKEN is a signed-in session.
  const authenticateRequest = jest.fn((request: Request) => {
    const authorization = request.headers.get('authorization');
    const userId =
      authorization === `Bearer ${VALID_TOKEN}` ? CALLER : undefined;
    return Promise.resolve({
      isAuthenticated: userId !== undefined,
      toAuth: () => ({ userId }),
    });
  });
  Object.assign(gateway, { clerkClient: { authenticateRequest } });

  let middleware: Middleware | undefined;
  const roomEmit = jest.fn();
  const server = {
    use: jest.fn((fn: Middleware) => {
      middleware = fn;
    }),
    to: jest.fn(() => ({ emit: roomEmit })),
  };
  gateway.server = server as unknown as Server;
  gateway.afterInit(server as unknown as Server);

  /** Runs the handshake middleware; resolves with the error it refused with. */
  const handshake = (socket: FakeSocket) =>
    new Promise<Error | undefined>((resolve) => middleware!(socket, resolve));

  return {
    gateway,
    chatsService,
    authenticateRequest,
    server,
    roomEmit,
    handshake,
  };
}

describe('ChatsGateway handshake', () => {
  it('takes the user id from a valid session token', async () => {
    const { handshake, authenticateRequest } = createGateway();
    const socket = fakeSocket({ auth: { token: VALID_TOKEN } });

    await expect(handshake(socket)).resolves.toBeUndefined();
    expect(socket.data.userId).toBe(CALLER);
    const [request] = authenticateRequest.mock.calls[0];
    expect(request.headers.get('authorization')).toBe(`Bearer ${VALID_TOKEN}`);
  });

  it('ignores a userId or x-user-id the client claims', async () => {
    const { handshake } = createGateway();
    const socket = fakeSocket({
      auth: { token: VALID_TOKEN, userId: OTHER },
      headers: { 'x-user-id': OTHER },
    });

    await expect(handshake(socket)).resolves.toBeUndefined();
    expect(socket.data.userId).toBe(CALLER);
  });

  it('refuses a handshake without a token, whatever userId it claims', async () => {
    const { handshake, authenticateRequest } = createGateway();
    const socket = fakeSocket({
      auth: { userId: CALLER },
      headers: { 'x-user-id': CALLER },
    });

    const error = await handshake(socket);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error?.message).toBe('Missing session token');
    expect(socket.data.userId).toBeUndefined();
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it('refuses a token that is not a string', async () => {
    const { handshake, authenticateRequest } = createGateway();

    const error = await handshake(
      fakeSocket({ auth: { token: { userId: CALLER } } }),
    );
    expect(error?.message).toBe('Missing session token');
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it('refuses an invalid token', async () => {
    const { handshake } = createGateway();
    const socket = fakeSocket({ auth: { token: 'forged', userId: CALLER } });

    const error = await handshake(socket);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error?.message).toBe('Invalid or expired session token');
    expect(socket.data.userId).toBeUndefined();
  });

  it('refuses the connection when Clerk cannot verify the token', async () => {
    const { handshake, authenticateRequest } = createGateway();
    authenticateRequest.mockRejectedValueOnce(new Error('JWKS fetch failed'));
    const socket = fakeSocket({ auth: { token: VALID_TOKEN } });

    const error = await handshake(socket);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error?.message).toBe('Token verification failed');
    expect(socket.data.userId).toBeUndefined();
  });
});

describe('ChatsGateway join_chat', () => {
  it('joins a guest of the match to the chat room', async () => {
    const { gateway, chatsService } = createGateway();
    const socket = callerSocket();

    await expect(
      gateway.handleJoinChat(socket as never, { chatId: CHAT_ID }),
    ).resolves.toEqual({ event: 'joined', data: { chatId: CHAT_ID } });
    expect(chatsService.getChatForParticipant).toHaveBeenCalledWith(
      CHAT_ID,
      CALLER,
    );
    expect(socket.join).toHaveBeenCalledWith(ROOM);
  });

  it('refuses someone outside the match', async () => {
    const { gateway } = createGateway();
    const socket = fakeSocket();
    socket.data.userId = 'user_third';

    const join = gateway.handleJoinChat(socket as never, { chatId: CHAT_ID });
    await expect(join).rejects.toBeInstanceOf(WsException);
    await expect(join).rejects.toThrow('Chat not found');
    expect(socket.join).not.toHaveBeenCalled();
  });

  it.each([['not-a-uuid'], [undefined], [42]])(
    'refuses chat id %p without a lookup',
    async (chatId) => {
      const { gateway, chatsService } = createGateway();
      const socket = callerSocket();

      await expect(
        gateway.handleJoinChat(socket as never, { chatId } as never),
      ).rejects.toThrow('Chat not found');
      expect(chatsService.getChatForParticipant).not.toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    },
  );

  it('passes database errors through instead of answering not found', async () => {
    const { gateway, chatsService } = createGateway();
    const dbError = { code: '57014', message: 'canceling statement' };
    chatsService.getChatForParticipant.mockRejectedValueOnce(dbError);

    await expect(
      gateway.handleJoinChat(callerSocket() as never, { chatId: CHAT_ID }),
    ).rejects.toBe(dbError);
  });
});

describe('ChatsGateway send_message', () => {
  it('stores the message as the verified user and sends it to the chat room', async () => {
    const { gateway, chatsService, server, roomEmit } = createGateway();

    await gateway.handleSendMessage(
      callerSocket([ROOM]) as never,
      {
        chatId: CHAT_ID,
        text: '  hi  ',
        senderId: OTHER,
      } as never,
    );

    expect(chatsService.createMessage).toHaveBeenCalledWith({
      chat_id: CHAT_ID,
      sender_id: CALLER,
      message: 'hi',
    });
    expect(server.to).toHaveBeenCalledWith(ROOM);
    expect(roomEmit).toHaveBeenCalledWith('new_message', {
      id: 'message-1',
      chatId: CHAT_ID,
      senderId: CALLER,
      text: 'hi',
      sentAt: '2026-10-20T10:00:00Z',
    });
  });

  it('refuses a sender outside the match, even one in the room', async () => {
    const { gateway, chatsService, roomEmit } = createGateway();
    const socket = fakeSocket({ rooms: [ROOM] });
    socket.data.userId = 'user_third';

    await expect(
      gateway.handleSendMessage(socket as never, {
        chatId: CHAT_ID,
        text: 'forged',
      }),
    ).rejects.toThrow('Chat not found');
    expect(chatsService.createMessage).not.toHaveBeenCalled();
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it.each([['   '], [undefined], [42]])(
    'ignores message text %p',
    async (text) => {
      const { gateway, chatsService, roomEmit } = createGateway();

      await expect(
        gateway.handleSendMessage(
          callerSocket([ROOM]) as never,
          {
            chatId: CHAT_ID,
            text,
          } as never,
        ),
      ).resolves.toBeUndefined();
      expect(chatsService.getChatForParticipant).not.toHaveBeenCalled();
      expect(chatsService.createMessage).not.toHaveBeenCalled();
      expect(roomEmit).not.toHaveBeenCalled();
    },
  );
});

describe('ChatsGateway typing', () => {
  it('tells the rest of a joined chat that the verified user is typing', () => {
    const { gateway, chatsService } = createGateway();
    const socket = callerSocket([ROOM]);

    gateway.handleTyping(
      socket as never,
      {
        chatId: CHAT_ID,
        isTyping: true,
        userId: OTHER,
      } as never,
    );

    expect(socket.to).toHaveBeenCalledWith(ROOM);
    expect(socket.emitToOthers).toHaveBeenCalledWith('user_typing', {
      userId: CALLER,
      isTyping: true,
    });
    expect(chatsService.getChatForParticipant).not.toHaveBeenCalled();
  });

  it('refuses typing in a chat the socket has not joined', () => {
    const { gateway } = createGateway();
    const socket = callerSocket();

    expect(() =>
      gateway.handleTyping(socket as never, {
        chatId: CHAT_ID,
        isTyping: true,
      }),
    ).toThrow(WsException);
    expect(socket.to).not.toHaveBeenCalled();
  });

  it('only relays a boolean isTyping', () => {
    const { gateway } = createGateway();
    const socket = callerSocket([ROOM]);

    gateway.handleTyping(
      socket as never,
      {
        chatId: CHAT_ID,
        isTyping: { html: '<b>x</b>' },
      } as never,
    );

    expect(socket.emitToOthers).toHaveBeenCalledWith('user_typing', {
      userId: CALLER,
      isTyping: false,
    });
  });
});
