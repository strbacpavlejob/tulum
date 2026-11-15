import { INestApplicationContext } from '@nestjs/common';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import type Redis from 'ioredis';
import { RedisIoAdapter } from './redis-io.adapter';

/** Redis pub/sub in memory, shared by the clients of every instance. */
class FakeRedis extends EventEmitter {
  private readonly patterns = new Set<string>();
  private readonly channels = new Set<string>();
  failPublish = false;
  connect = jest.fn(() => Promise.resolve());
  disconnect = jest.fn();

  constructor(private readonly bus: Set<FakeRedis>) {
    super();
  }

  duplicate() {
    return new FakeRedis(this.bus);
  }

  psubscribe(pattern: string) {
    this.patterns.add(pattern);
    this.bus.add(this);
    return Promise.resolve(1);
  }

  subscribe(channels: string[]) {
    for (const channel of channels) this.channels.add(channel);
    this.bus.add(this);
    return Promise.resolve(channels.length);
  }

  publish(channel: string, message: Buffer) {
    if (this.failPublish) return Promise.reject(new Error('Connection lost'));
    for (const subscriber of this.bus) {
      for (const pattern of subscriber.patterns) {
        if (channel.startsWith(pattern.slice(0, -1))) {
          subscriber.emit(
            'pmessageBuffer',
            Buffer.from(pattern),
            Buffer.from(channel),
            message,
          );
        }
      }
      if (subscriber.channels.has(channel)) {
        subscriber.emit('messageBuffer', Buffer.from(channel), message);
      }
    }
    return Promise.resolve(1);
  }
}

const REDIS_ENV = { REDIS_URL: 'redis://redis.invalid:6379' };

/** One API instance: an HTTP server with socket.io on the adapter. */
async function instance(bus: Set<FakeRedis>) {
  const pub = new FakeRedis(bus);
  const sub = pub.duplicate();
  const http = createServer();
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const adapter = new RedisIoAdapter(
    http as unknown as INestApplicationContext,
    () => [pub as unknown as Redis, sub as unknown as Redis],
  );
  await adapter.connectToRedis(REDIS_ENV);
  const io = adapter.createIOServer(0, { transports: ['websocket'] });
  return { http, io, adapter, pub };
}

/** A websocket speaking socket.io's protocol, as the app's client does. */
function connectClient(http: HttpServer) {
  const { port } = http.address() as AddressInfo;
  const ws = new WebSocket(
    `ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`,
  );
  const events: unknown[][] = [];
  const connected = new Promise<void>((resolve) => {
    ws.onmessage = (message: MessageEvent) => {
      const data = String(message.data);
      if (data.startsWith('0')) ws.send('40');
      else if (data.startsWith('40')) resolve();
      else if (data === '2') ws.send('3');
      else if (data.startsWith('42')) {
        events.push(JSON.parse(data.slice(2)) as unknown[]);
      }
    };
  });
  return { ws, events, connected };
}

describe('RedisIoAdapter', () => {
  const cleanups: (() => Promise<void> | void)[] = [];

  afterEach(async () => {
    while (cleanups.length) await cleanups.pop()!();
    jest.useRealTimers();
  });

  it('keeps sockets within one instance without Redis settings', async () => {
    const createClients = jest.fn(() => null);
    const adapter = new RedisIoAdapter(
      createServer() as unknown as INestApplicationContext,
      createClients,
    );

    await adapter.connectToRedis({});

    expect(adapter.sharedAcrossInstances).toBe(false);
  });

  it('delivers a push sent on one instance to a socket on another', async () => {
    const bus = new Set<FakeRedis>();
    const one = await instance(bus);
    const two = await instance(bus);
    for (const { io, http } of [one, two]) {
      cleanups.push(
        () => new Promise<void>((resolve) => void io.close(() => resolve())),
        () => void http.close(),
      );
    }
    expect(one.adapter.sharedAcrossInstances).toBe(true);

    // The guest's socket is on instance two, in their room.
    const joined = new Promise<void>((resolve) => {
      two.io.on('connection', (socket) => {
        void Promise.resolve(socket.join('user:ana')).then(() => resolve());
      });
    });
    const client = connectClient(two.http);
    cleanups.push(() => client.ws.close());
    await client.connected;
    await joined;

    // A match made on instance one.
    one.io.to('user:ana').emit('inbox_changed', { reason: 'match' });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(client.events).toEqual([['inbox_changed', { reason: 'match' }]]);
  });

  it('settles for one instance when Redis does not answer at startup', async () => {
    jest.useFakeTimers();
    const bus = new Set<FakeRedis>();
    const pub = new FakeRedis(bus);
    const sub = pub.duplicate();
    pub.connect.mockImplementation(() => new Promise<void>(() => {}));
    const adapter = new RedisIoAdapter(
      createServer() as unknown as INestApplicationContext,
      () => [pub as unknown as Redis, sub as unknown as Redis],
    );

    const connecting = adapter.connectToRedis(REDIS_ENV);
    await jest.advanceTimersByTimeAsync(5_000);
    await connecting;

    expect(adapter.sharedAcrossInstances).toBe(false);
    expect(pub.disconnect).toHaveBeenCalled();
    expect(sub.disconnect).toHaveBeenCalled();
  });

  it('logs a failed publish instead of leaving it unhandled', async () => {
    const bus = new Set<FakeRedis>();
    const { io, http, pub } = await instance(bus);
    cleanups.push(
      () => new Promise<void>((resolve) => void io.close(() => resolve())),
      () => void http.close(),
    );
    pub.failPublish = true;

    // Redis went away mid-event: the publish still settles.
    await expect(
      (pub as unknown as Redis).publish('socket.io#/#', 'x'),
    ).resolves.toBe(0);
  });
});
