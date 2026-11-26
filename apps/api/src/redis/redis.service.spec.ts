import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { RedisService } from './redis.service';

/** Just enough of an ioredis client, keeping values in a Map. */
function serviceWithClient(status: string) {
  const store = new Map<string, string>();
  const client = {
    status,
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn<
      (key: string, value: string, ...options: unknown[]) => Promise<string>
    >((key, value) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    // ioredis moves to 'connecting' as soon as connect is called.
    connect: jest.fn(() => {
      client.status = 'connecting';
      return Promise.resolve();
    }),
  };
  const service = new RedisService();
  Object.assign(service, { client });
  return { service, client, store };
}

describe('RedisService remember', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads once, caches the value for the TTL and answers from the cache', async () => {
    const { service, client } = serviceWithClient('ready');
    const load = jest.fn(() => Promise.resolve({ events: ['a'] }));

    await expect(service.remember('feed', 45, load)).resolves.toEqual({
      events: ['a'],
    });
    await expect(service.remember('feed', 45, load)).resolves.toEqual({
      events: ['a'],
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(client.set).toHaveBeenCalledWith(
      'feed',
      JSON.stringify({ events: ['a'] }),
      'EX',
      45,
    );
  });

  it('shares one load between requests that miss the same key at once', async () => {
    const { service } = serviceWithClient('ready');
    let finish: (value: string) => void = () => undefined;
    const load = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );

    const first = service.remember('feed', 45, load);
    const second = service.remember('feed', 45, load);
    // Both reach the load step after their cache reads.
    await new Promise((resolve) => setImmediate(resolve));
    finish('listing');

    await expect(Promise.all([first, second])).resolves.toEqual([
      'listing',
      'listing',
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('loads straight from the database while Redis is not connected, and starts connecting', async () => {
    const { service, client } = serviceWithClient('wait');
    const load = jest.fn(() => Promise.resolve('listing'));

    await expect(service.remember('feed', 45, load)).resolves.toBe('listing');

    expect(load).toHaveBeenCalledTimes(1);
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.get).not.toHaveBeenCalled();
    expect(client.set).not.toHaveBeenCalled();
  });

  it('does not wait more than 250 ms for a Redis that does not answer', async () => {
    jest.useFakeTimers();
    const { service, client } = serviceWithClient('ready');
    client.get.mockImplementation(() => new Promise<string | null>(() => {}));
    const load = jest.fn(() => Promise.resolve('listing'));

    const result = service.remember('feed', 45, load);
    await jest.advanceTimersByTimeAsync(249);
    expect(load).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe('listing');
  });

  it('caches nothing when the load fails, so the next request loads again', async () => {
    const { service, store } = serviceWithClient('ready');
    const load = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('database down'))
      .mockResolvedValueOnce('listing');

    await expect(service.remember('feed', 45, load)).rejects.toThrow(
      'database down',
    );
    expect(store.size).toBe(0);
    await expect(service.remember('feed', 45, load)).resolves.toBe('listing');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('RedisService setIfAbsent', () => {
  it('sets a free key, leaves a taken one, and says when Redis did not answer', async () => {
    const { service, client, store } = serviceWithClient('ready');
    client.set.mockImplementation((key, value, ...options) => {
      if (options.includes('NX') && store.has(key)) {
        return Promise.resolve(null as unknown as string);
      }
      store.set(key, value);
      return Promise.resolve('OK');
    });

    await expect(service.setIfAbsent('claim', { run: 1 }, 60)).resolves.toBe(
      true,
    );
    expect(client.set).toHaveBeenCalledWith(
      'claim',
      JSON.stringify({ run: 1 }),
      'EX',
      60,
      'NX',
    );
    await expect(service.setIfAbsent('claim', { run: 2 }, 60)).resolves.toBe(
      false,
    );
    expect(store.get('claim')).toBe(JSON.stringify({ run: 1 }));

    client.set.mockRejectedValueOnce(new Error('Connection is closed.'));
    await expect(service.setIfAbsent('other', 1, 60)).resolves.toBeNull();
  });
});
