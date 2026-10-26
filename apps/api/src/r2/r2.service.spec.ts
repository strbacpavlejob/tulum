import {
  DeleteObjectCommand,
  ListObjectsV2Command,
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
