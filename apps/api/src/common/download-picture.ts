import axios from 'axios';
import sharp from 'sharp';

/* The same limit as a host's upload. */
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

const DOWNLOAD_TIMEOUT_MS = 15_000;

/* Some CDNs refuse clients that don't look like a browser. */
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type PictureDownload =
  | { picture: Buffer }
  | {
      error: string;
      /** The address answered 404 or 410: it will never give the picture. */
      gone: boolean;
    };

/** Downloads the picture at url, when it is one sharp can read. */
export async function downloadPicture(url: string): Promise<PictureDownload> {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT_MS,
      maxContentLength: MAX_PICTURE_BYTES,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
    });
    const picture = Buffer.from(response.data);
    // Throws for anything sharp can't read as an image.
    await sharp(picture).metadata();
    return { picture };
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;
    return {
      error: status
        ? `HTTP ${status}`
        : error instanceof Error
          ? error.message
          : String(error),
      gone: status === 404 || status === 410,
    };
  }
}
