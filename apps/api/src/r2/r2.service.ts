import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET_NAME ?? '';
    this.publicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  async downloadAndUpload(
    sourceUrl: string,
    key: string,
    options?: { width?: number; height?: number; maxSize?: number },
  ): Promise<string | null> {
    const width = options?.width ?? 200;
    const height = options?.height ?? 200;
    const maxSize = options?.maxSize ?? null;

    try {
      const response = await axios.get<Buffer>(sourceUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'tulum-api/1.0 (image mirror)' },
      });

      if (maxSize !== null && response.data.byteLength > maxSize) {
        this.logger.warn(
          `Skipping image from ${sourceUrl.substring(0, 80)}: size ${response.data.byteLength} exceeds limit ${maxSize}`,
        );
        return null;
      }

      const resized = await sharp(Buffer.from(response.data))
        .resize(width, height, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toBuffer();

      return await this.uploadBuffer(key, resized, 'image/webp');
    } catch (err) {
      this.logger.error(
        `Failed to mirror image from ${sourceUrl.substring(0, 80)}:`,
        err,
      );
      return null;
    }
  }
}
