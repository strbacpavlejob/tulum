import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { R2Service } from './r2.service';

type Page = Pick<
  ListObjectsV2CommandOutput,
  'Contents' | 'IsTruncated' | 'NextContinuationToken'
>;

describe('R2Service.deleteFolder (BUG-001)', () => {
  const savedBucket = process.env.R2_BUCKET_NAME;
  let pages: Page[];
  let send: jest.Mock<(command: object) => Promise<Page | object>>;
  let service: R2Service;

  beforeEach(() => {
    process.env.R2_BUCKET_NAME = 'tulum-test';
    pages = [];
    send = jest.fn((command: object) =>
      Promise.resolve(
        command instanceof ListObjectsV2Command ? (pages.shift() ?? {}) : {},
      ),
    );
    service = new R2Service();
    Object.assign(service, { client: { send } });
  });

  afterEach(() => {
    process.env.R2_BUCKET_NAME = savedBucket;
  });

  const sent = () =>
    send.mock.calls.map(([command]) =>
      command instanceof DeleteObjectCommand
        ? `delete ${command.input.Key}`
        : command instanceof ListObjectsV2Command
          ? `list ${command.input.Prefix} ${command.input.ContinuationToken ?? '-'}`
          : 'other',
    );

  it('deletes every object under the folder, page by page', async () => {
    pages = [
      {
        Contents: [
          { Key: 'guests/user_1/a.webp' },
          { Key: 'guests/user_1/b.webp' },
        ],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      },
      { Contents: [{ Key: 'guests/user_1/c.webp' }], IsTruncated: false },
    ];

    await expect(service.deleteFolder('guests/user_1/')).resolves.toBe(3);
    expect(sent()).toEqual([
      'list guests/user_1/ -',
      'delete guests/user_1/a.webp',
      'delete guests/user_1/b.webp',
      'list guests/user_1/ page-2',
      'delete guests/user_1/c.webp',
    ]);
  });

  it('returns 0 for an empty folder', async () => {
    pages = [{ IsTruncated: false }];

    await expect(service.deleteFolder('guests/user_1/')).resolves.toBe(0);
    expect(sent()).toEqual(['list guests/user_1/ -']);
  });

  it.each(['', '/', 'guests/user_1', 'guests'])(
    'refuses "%s", which is not a folder',
    async (prefix) => {
      await expect(service.deleteFolder(prefix)).rejects.toThrow(
        'Not a folder prefix',
      );
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('fails without a bucket instead of listing nothing', async () => {
    process.env.R2_BUCKET_NAME = '';
    service = new R2Service();
    Object.assign(service, { client: { send } });

    await expect(service.deleteFolder('guests/user_1/')).rejects.toThrow(
      'R2_BUCKET_NAME is not set',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('stops at the first failed deletion', async () => {
    pages = [
      {
        Contents: [
          { Key: 'guests/user_1/a.webp' },
          { Key: 'guests/user_1/b.webp' },
        ],
        IsTruncated: false,
      },
    ];
    send.mockImplementation((command: object) =>
      command instanceof DeleteObjectCommand
        ? Promise.reject(new Error('R2 unavailable'))
        : Promise.resolve(pages.shift() ?? {}),
    );

    await expect(service.deleteFolder('guests/user_1/')).rejects.toThrow(
      'R2 unavailable',
    );
    expect(sent()).toEqual([
      'list guests/user_1/ -',
      'delete guests/user_1/a.webp',
    ]);
  });
});

describe('R2Service public URLs (moving off r2.dev)', () => {
  const NEW_BASE = 'https://img.tulum-app.com';
  const OLD_BASE = 'https://pub-0123.r2.dev';
  const saved = {
    publicUrl: process.env.R2_PUBLIC_URL,
    legacy: process.env.R2_LEGACY_PUBLIC_URLS,
  };

  // Assigning undefined to process.env stores the string "undefined".
  const setEnv = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };

  afterEach(() => {
    setEnv('R2_PUBLIC_URL', saved.publicUrl);
    setEnv('R2_LEGACY_PUBLIC_URLS', saved.legacy);
  });

  const create = (publicUrl: string, legacy?: string) => {
    setEnv('R2_PUBLIC_URL', publicUrl);
    setEnv('R2_LEGACY_PUBLIC_URLS', legacy);
    return new R2Service();
  };

  it('reads keys from URLs on the current base', () => {
    const service = create(`${NEW_BASE}/`);

    expect(service.extractKeyFromUrl(`${NEW_BASE}/guests/u/a.webp`)).toBe(
      'guests/u/a.webp',
    );
    expect(service.extractKeyFromUrl(`${OLD_BASE}/guests/u/a.webp`)).toBeNull();
  });

  it('also reads keys from URLs on a legacy base, so old rows can still be deleted', () => {
    const service = create(NEW_BASE, ` ${OLD_BASE}/ , https://other.example `);

    expect(service.extractKeyFromUrl(`${OLD_BASE}/guests/u/a.webp`)).toBe(
      'guests/u/a.webp',
    );
    expect(service.extractKeyFromUrl(`${NEW_BASE}/venue-images/v.webp`)).toBe(
      'venue-images/v.webp',
    );
    expect(
      service.extractKeyFromUrl('https://picsum.photos/200/300'),
    ).toBeNull();
  });

  it('reads no keys when no base URL is configured', () => {
    const service = create('', '');

    expect(service.extractKeyFromUrl('/guests/u/a.webp')).toBeNull();
  });

  it('uploads with a cache header and returns the current base URL', async () => {
    const service = create(NEW_BASE, OLD_BASE);
    const send = jest.fn((command: object) => Promise.resolve(command));
    Object.assign(service, { client: { send } });

    await expect(
      service.uploadBuffer('guests/u/a.webp', Buffer.from('x'), 'image/webp'),
    ).resolves.toBe(`${NEW_BASE}/guests/u/a.webp`);

    const [command] = send.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Key: 'guests/u/a.webp',
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=86400',
    });
  });
});
