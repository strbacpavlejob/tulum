import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

/** How long remember waits for Redis before it loads the value itself. */
const CACHE_READ_TIMEOUT_MS = 250;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  /** remember's loads in progress, by key. */
  private readonly loading = new Map<string, Promise<unknown>>();

  constructor() {
    const url = process.env.REDIS_URL;
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);

    this.client = url
      ? new Redis(url, { lazyConnect: true })
      : new Redis({ host, port, lazyConnect: true });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err: Error) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      this.logger.warn(
        `Cache get failed for key "${key}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Cache set failed for key "${key}": ${(err as Error).message}`,
      );
    }
  }

  /**
   * Sets key to value for ttlSeconds unless the key holds something: true
   * when it was set, false when it was taken. Null when Redis didn't answer,
   * so a caller can tell "taken" from "unknown".
   */
  async setIfAbsent(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<boolean | null> {
    try {
      const result = await this.client.set(
        key,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
        'NX',
      );
      return result === 'OK';
    } catch (err) {
      this.logger.warn(
        `Cache set-if-absent failed for key "${key}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Cache del failed for key "${key}": ${(err as Error).message}`,
      );
    }
  }

  /**
   * The value cached under key, or else what load returns, which is then
   * cached for ttlSeconds. The cache never holds a request up: while Redis
   * isn't connected, or doesn't answer within CACHE_READ_TIMEOUT_MS, load's
   * value is returned (get and set would wait for a reconnect). Requests in
   * this process that miss the same key at once share one load.
   */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    if (this.isReady()) {
      const cached = await this.getWithin<T>(key, CACHE_READ_TIMEOUT_MS);
      if (cached !== null) return cached;
    }

    const inProgress = this.loading.get(key) as Promise<T> | undefined;
    if (inProgress) return inProgress;
    const loaded = load()
      .then((value) => {
        if (this.isReady()) void this.set(key, value, ttlSeconds);
        return value;
      })
      .finally(() => this.loading.delete(key));
    this.loading.set(key, loaded);
    return loaded;
  }

  /** Whether commands go out now. A client not connected yet starts. */
  private isReady(): boolean {
    if (this.client.status === 'wait') {
      // A failure is logged by the error listener, and ioredis retries.
      this.client.connect().catch(() => undefined);
    }
    return this.client.status === 'ready';
  }

  private async getWithin<T>(key: string, ms: number): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined;
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    });
    try {
      return await Promise.race([this.get<T>(key), timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }
}
