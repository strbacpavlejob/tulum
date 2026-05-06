import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  Canvas,
  CanvasRenderingContext2D,
  createCanvas,
  loadImage,
} from 'canvas';
import { format } from 'date-fns';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Event } from '../scrape/interfaces/event.interface';
import { Venue } from '../scrape/interfaces/venue.interface';

interface DbEventPreviewRow {
  id: number;
  title: string;
  start_date_time: string;
  tags?: string[];
  picture_url?: string;
  venues?: {
    name?: string;
    address?: string;
    picture_url?: string;
  };
}

interface InstagramEventPostData {
  title: string;
  startDateTimeStamp: string;
  address: string;
  venue: string;
  eventImageUrl: string;
  venueLogoImageUrl: string;
  postDescriptionMetaData: string;
}

@Injectable()
export class InstagramPostService {
  private readonly logger = new Logger(InstagramPostService.name);

  async createAndPublishFromScraped(
    event?: Omit<Event, 'id'> & { id?: number },
    venue?: Omit<Venue, 'id'>,
  ): Promise<Record<string, unknown>> {
    if (!event) {
      return {
        status: 'skipped',
        reason: 'No scraped events found',
      };
    }

    const postData = this.buildPostData(event, venue);
    const generatedImagePath = await this.renderPostImage(postData);
    const publishResult = await this.publishToInstagram(postData);

    return {
      postData,
      generatedImagePath,
      ...publishResult,
    };
  }

  private buildPostData(
    event: Omit<Event, 'id'> & { id?: number },
    venue?: Omit<Venue, 'id'>,
  ): InstagramEventPostData {
    const tags = event.tags?.length
      ? event.tags.map((tag) => `#${tag.replace(/\s+/g, '')}`).join(' ')
      : '#tulum #event';

    const dateObj = event.start_date_time
      ? new Date(event.start_date_time)
      : null;
    const dateStr = dateObj ? format(dateObj, 'EEEE, dd MMMM yyyy') : '—';
    const timeStr = dateObj ? format(dateObj, 'HH:mm') : '—';
    const start = dateObj ? `${dateStr} at ${timeStr}` : '—';
    const venueName = event.venue_name ?? venue?.name ?? 'Unknown venue';
    const address = venue?.address ?? 'Address not available';
    const eventImageUrl = event.picture ?? '';
    const venueLogoImageUrl = venue?.picture ?? event.picture ?? '';

    return {
      title: event.title,
      startDateTimeStamp: event.start_date_time,
      address,
      venue: venueName,
      eventImageUrl,
      venueLogoImageUrl,
      postDescriptionMetaData:
        `${event.title}\n` +
        `When: ${start}\n` +
        `Where: ${venueName}, ${address}\n\n` +
        `${tags}`,
    };
  }

  private async buildCanvas(postData: InstagramEventPostData): Promise<Canvas> {
    const W = 1080;
    const H = 1080;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // ── 1. Background: full-bleed event image ─────────────────────────────
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    if (postData.eventImageUrl) {
      try {
        const img = await loadImage(postData.eventImageUrl);
        // cover-fit
        const scale = Math.max(W / img.width, H / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const dx = (W - drawW) / 2;
        const dy = (H - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
      } catch {
        this.logger.warn(
          `Failed to load event image: ${postData.eventImageUrl}`,
        );
      }
    }

    // ── 2. Full-canvas dark vignette so text stays readable ───────────────
    const vignette = ctx.createRadialGradient(
      W / 2,
      H / 2,
      W * 0.25,
      W / 2,
      H / 2,
      W * 0.85,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // ── 3. Frosted-glass card ─────────────────────────────────────────────
    const cardX = 64;
    const cardY = 540;
    const cardW = W - 128;
    const cardH = 440;
    const radius = 28;

    // Multi-layer blur simulation: several translucent fills + noise
    const blurLayers = [
      'rgba(15, 23, 42, 0.55)',
      'rgba(30, 41, 59, 0.30)',
      'rgba(255,255,255, 0.06)',
    ];
    for (const color of blurLayers) {
      ctx.save();
      this.roundRect(ctx, cardX, cardY, cardW, cardH, radius);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    // Glass border
    ctx.save();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Clip all card content to rounded rect
    ctx.save();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.clip();

    // ── 4. Title — centered, on top of card ───────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleLines = this.splitLines(ctx, postData.title, cardW - 80);
    const titleLineH = 68;
    const titleBlockH = titleLines.length * titleLineH;
    const titleStartY = cardY + 44 + titleLineH / 2;
    titleLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, titleStartY + i * titleLineH);
    });

    // ── 5. Metadata rows with Lucide-style icons ──────────────────────────
    const rowLeft = cardX + 48;
    const iconSize = 36;
    const iconTextGap = 18;
    const rowLineH = 68;
    let rowY = cardY + titleBlockH + 80;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const dateObj = postData.startDateTimeStamp
      ? new Date(postData.startDateTimeStamp)
      : null;

    const dateStr = dateObj ? format(dateObj, 'EEEE, dd MMMM yyyy') : '—';
    const timeStr = dateObj ? format(dateObj, 'HH:mm') : '—';

    // Calendar icon + date
    this.drawIcon(ctx, rowLeft, rowY - iconSize / 2, iconSize, 'calendar');
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '38px sans-serif';
    ctx.fillText(dateStr, rowLeft + iconSize + iconTextGap, rowY);
    rowY += rowLineH;

    // Clock icon + time
    this.drawIcon(ctx, rowLeft, rowY - iconSize / 2, iconSize, 'clock');
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(timeStr, rowLeft + iconSize + iconTextGap, rowY);
    rowY += rowLineH;

    // Map-pin icon + venue
    this.drawIcon(ctx, rowLeft, rowY - iconSize / 2, iconSize, 'mapPin');
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '36px sans-serif';
    ctx.fillText(
      this.truncate(ctx, postData.venue, cardW - 80 - iconSize - iconTextGap),
      rowLeft + iconSize + iconTextGap,
      rowY,
    );
    rowY += rowLineH;

    // Location/building icon + address
    this.drawIcon(ctx, rowLeft, rowY - iconSize / 2, iconSize, 'building');
    ctx.fillStyle = '#94a3b8';
    ctx.font = '34px sans-serif';
    ctx.fillText(
      this.truncate(ctx, postData.address, cardW - 80 - iconSize - iconTextGap),
      rowLeft + iconSize + iconTextGap,
      rowY,
    );

    ctx.restore(); // end card clip

    // ── 6. Venue logo — top-right circle ─────────────────────────────────
    if (postData.venueLogoImageUrl) {
      try {
        const logo = await loadImage(postData.venueLogoImageUrl);
        const logoR = 64;
        const logoCX = W - 80 - logoR;
        const logoCY = 80 + logoR;
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCX, logoCY, logoR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          logo,
          logoCX - logoR,
          logoCY - logoR,
          logoR * 2,
          logoR * 2,
        );
        ctx.restore();
        // ring
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoCX, logoCY, logoR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      } catch {
        this.logger.warn(
          `Failed to load venue logo: ${postData.venueLogoImageUrl}`,
        );
      }
    }

    return canvas;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private splitLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private truncate(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let truncated = text;
    while (
      truncated.length > 0 &&
      ctx.measureText(`${truncated}…`).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}…`;
  }

  /**
   * Draws Lucide-style 24px-grid icons scaled to `size` px at (x, y) top-left.
   * All paths are hand-translated from the official Lucide SVG source.
   */
  private drawIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    icon: 'calendar' | 'clock' | 'mapPin' | 'building',
  ): void {
    const s = size / 24;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2 / s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'transparent';

    ctx.beginPath();
    if (icon === 'calendar') {
      // rect
      ctx.roundRect(3, 4, 18, 18, 2);
      ctx.stroke();
      // vertical lines top
      ctx.beginPath();
      ctx.moveTo(16, 2);
      ctx.lineTo(16, 6);
      ctx.moveTo(8, 2);
      ctx.lineTo(8, 6);
      // horizontal divider
      ctx.moveTo(3, 10);
      ctx.lineTo(21, 10);
      ctx.stroke();
    } else if (icon === 'clock') {
      // circle
      ctx.beginPath();
      ctx.arc(12, 12, 9, 0, Math.PI * 2);
      ctx.stroke();
      // hands
      ctx.beginPath();
      ctx.moveTo(12, 7);
      ctx.lineTo(12, 12);
      ctx.lineTo(15.5, 14.5);
      ctx.stroke();
    } else if (icon === 'mapPin') {
      // pin body
      ctx.beginPath();
      ctx.moveTo(12, 22);
      ctx.bezierCurveTo(12, 22, 5, 14.5, 5, 9);
      ctx.arc(12, 9, 7, Math.PI, 0, false);
      ctx.bezierCurveTo(19, 14.5, 12, 22, 12, 22);
      ctx.stroke();
      // inner circle
      ctx.beginPath();
      ctx.arc(12, 9, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (icon === 'building') {
      // Main building
      ctx.beginPath();
      ctx.rect(3, 3, 13, 18);
      ctx.stroke();
      // Right wing
      ctx.beginPath();
      ctx.moveTo(16, 8);
      ctx.lineTo(21, 8);
      ctx.lineTo(21, 21);
      ctx.lineTo(16, 21);
      ctx.stroke();
      // windows left building
      ctx.beginPath();
      ctx.rect(6, 7, 2.5, 2.5);
      ctx.rect(10.5, 7, 2.5, 2.5);
      ctx.rect(6, 12, 2.5, 2.5);
      ctx.rect(10.5, 12, 2.5, 2.5);
      ctx.stroke();
      // door
      ctx.beginPath();
      ctx.rect(7.5, 17, 4, 4);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── File / base64 rendering ──────────────────────────────────────────────

  private async renderPostImage(
    postData: InstagramEventPostData,
  ): Promise<string> {
    const canvas = await this.buildCanvas(postData);
    const outputDir = join(process.cwd(), 'tmp');
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, 'instagram-post.jpg');
    await writeFile(outputPath, canvas.toBuffer('image/jpeg'));
    return outputPath;
  }

  private async renderToBase64(
    postData: InstagramEventPostData,
  ): Promise<string> {
    const canvas = await this.buildCanvas(postData);
    return canvas.toBuffer('image/jpeg').toString('base64');
  }

  private buildPostDataFromDbRow(
    row: DbEventPreviewRow,
  ): InstagramEventPostData {
    const venue = row.venues;
    const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
    const tagStr = tags.length
      ? tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')
      : '#tulum #event';
    const title = row.title ?? 'Untitled Event';
    const startDateTimeStamp = row.start_date_time ?? '';
    const venueName = venue?.name ?? 'Unknown venue';
    const address = venue?.address ?? 'Address not available';
    const eventImageUrl = row.picture_url ?? '';
    const venueLogoImageUrl = venue?.picture_url ?? row.picture_url ?? '';
    const dateObj = startDateTimeStamp ? new Date(startDateTimeStamp) : null;
    const dateStr = dateObj ? format(dateObj, 'EEEE, dd MMMM yyyy') : '—';
    const timeStr = dateObj ? format(dateObj, 'HH:mm') : '—';

    return {
      title,
      startDateTimeStamp,
      address,
      venue: venueName,
      eventImageUrl,
      venueLogoImageUrl,
      postDescriptionMetaData:
        `${title}\n` +
        `When: ${dateStr} at ${timeStr}\n` +
        `Where: ${venueName}, ${address}\n\n` +
        `${tagStr}`,
    };
  }

  async previewPostAsBase64(dbRow: DbEventPreviewRow): Promise<string> {
    const postData = this.buildPostDataFromDbRow(dbRow);
    return this.renderToBase64(postData);
  }

  private async publishToInstagram(
    postData: InstagramEventPostData,
  ): Promise<Record<string, unknown>> {
    const accessToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
    const instagramUserId = process.env.INSTAGRAM_USER_ID;
    const canvasImagePublicUrl = process.env.INSTAGRAM_CANVAS_IMAGE_URL;

    if (!accessToken || !instagramUserId || !canvasImagePublicUrl) {
      this.logger.warn(
        'Instagram publish skipped: set INSTAGRAM_GRAPH_ACCESS_TOKEN, INSTAGRAM_USER_ID, INSTAGRAM_CANVAS_IMAGE_URL',
      );
      return {
        status: 'skipped',
        reason:
          'Missing INSTAGRAM_GRAPH_ACCESS_TOKEN, INSTAGRAM_USER_ID or INSTAGRAM_CANVAS_IMAGE_URL',
      };
    }

    const version = process.env.INSTAGRAM_GRAPH_VERSION ?? 'v22.0';
    const baseUrl = `https://graph.facebook.com/${version}`;

    const createMediaResponse = await axios.post(
      `${baseUrl}/${instagramUserId}/media`,
      null,
      {
        params: {
          image_url: canvasImagePublicUrl,
          caption: postData.postDescriptionMetaData,
          access_token: accessToken,
        },
      },
    );

    const creationId = createMediaResponse.data?.id as string | undefined;
    if (!creationId) {
      throw new Error('Instagram media creation failed: missing creation id');
    }

    const publishResponse = await axios.post(
      `${baseUrl}/${instagramUserId}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken,
        },
      },
    );

    this.logger.log(
      `Instagram post published with id ${publishResponse.data?.id as string}`,
    );

    return {
      status: 'published',
      creationId,
      mediaId: publishResponse.data?.id,
    };
  }
}
