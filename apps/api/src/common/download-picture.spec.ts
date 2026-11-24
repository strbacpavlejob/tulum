import {
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import axios, { AxiosError, AxiosResponse } from 'axios';
import sharp from 'sharp';
import { downloadPicture } from './download-picture';

const URL = 'https://assets.tickets.rs/poster.jpg';

let picture: Buffer;

beforeAll(async () => {
  picture = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#d04040' },
  })
    .png()
    .toBuffer();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function answer(status: number) {
  return new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    { status } as AxiosResponse,
  );
}

describe('downloadPicture', () => {
  it('returns the picture, asking for it as a browser would', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({ data: picture });

    await expect(downloadPicture(URL)).resolves.toEqual({ picture });
    expect(get).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        maxContentLength: 5 * 1024 * 1024,
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Mozilla/5.0'),
        }),
      }),
    );
  });

  it.each([404, 410])(
    'calls a picture that answers %p gone',
    async (status) => {
      jest.spyOn(axios, 'get').mockRejectedValue(answer(status));

      await expect(downloadPicture(URL)).resolves.toEqual({
        error: `HTTP ${status}`,
        gone: true,
      });
    },
  );

  it.each([403, 429, 503])(
    'keeps a picture that answers %p for another try',
    async (status) => {
      jest.spyOn(axios, 'get').mockRejectedValue(answer(status));

      await expect(downloadPicture(URL)).resolves.toEqual({
        error: `HTTP ${status}`,
        gone: false,
      });
    },
  );

  it('fails without a status when the site is unreachable', async () => {
    jest
      .spyOn(axios, 'get')
      .mockRejectedValue(new AxiosError('timeout of 15000ms exceeded'));

    await expect(downloadPicture(URL)).resolves.toEqual({
      error: 'timeout of 15000ms exceeded',
      gone: false,
    });
  });

  it('fails for a page that is not a picture', async () => {
    jest
      .spyOn(axios, 'get')
      .mockResolvedValue({ data: Buffer.from('<html>Just a moment…</html>') });

    await expect(downloadPicture(URL)).resolves.toMatchObject({ gone: false });
  });
});
