import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/** How long startup waits for Redis before running sockets on one instance. */
const CONNECT_TIMEOUT_MS = 5_000;

type Env = Record<string, string | undefined>;

/**
 * The pub and sub clients the adapter needs, from the same settings as
 * RedisService (REDIS_URL, or REDIS_HOST and REDIS_PORT), or null when
 * neither is set. Commands wait for a reconnect instead of failing.
 */
export function redisClientsFrom(env: Env): [Redis, Redis] | null {
  const options = { lazyConnect: true, maxRetriesPerRequest: null };
  let pub: Redis;
  if (env.REDIS_URL) {
    pub = new Redis(env.REDIS_URL, options);
  } else if (env.REDIS_HOST) {
    pub = new Redis({
      ...options,
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT ?? '6379', 10),
    });
  } else {
    return null;
  }
  return [pub, pub.duplicate()];
}

/**
 * socket.io across API instances. Rooms (a chat, a user's inbox) are shared
 * through Redis pub/sub, so a push reaches a socket on any instance and
 * Railway can run replicas. The app's socket is websocket-only, so no
 * sticky sessions are needed. Without Redis (not configured, or not
 * reachable at startup) sockets work within one instance, as before.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly createClients: (
      env: Env,
    ) => [Redis, Redis] | null = redisClientsFrom,
  ) {
    super(app);
  }

  /** Whether sockets go through Redis. */
  get sharedAcrossInstances(): boolean {
    return this.adapterConstructor !== undefined;
  }

  /** Connects the pub/sub clients, or settles for one instance. Never throws. */
  async connectToRedis(env: Env = process.env): Promise<void> {
    const clients = this.createClients(env);
    if (!clients) {
      this.logger.log('No Redis configured: sockets work within one instance');
      return;
    }
    const [pub, sub] = clients;
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        Promise.all([pub.connect(), sub.connect()]),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`no answer in ${CONNECT_TIMEOUT_MS} ms`)),
            CONNECT_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (err) {
      this.logger.warn(
        `Redis unreachable (${(err as Error).message}): sockets work within one instance`,
      );
      pub.disconnect();
      sub.disconnect();
      return;
    } finally {
      clearTimeout(timer);
    }

    // The adapter publishes without awaiting the result. A failed publish
    // (Redis down mid-event) would be an unhandled rejection, which ends
    // the process, so it is logged instead: the push still reaches sockets
    // on this instance.
    const publish = pub.publish.bind(pub) as (
      ...args: unknown[]
    ) => Promise<number>;
    pub.publish = (...args: unknown[]) =>
      publish(...args).catch((err: Error) => {
        this.logger.warn(`Socket push not shared: ${err.message}`);
        return 0;
      });

    this.adapterConstructor = createAdapter(pub, sub);
    this.logger.log('Sockets are shared across instances through Redis');
  }

  // Nest passes only the options a gateway sets, hence Partial.
  createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
