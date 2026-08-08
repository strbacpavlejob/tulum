import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class GeocoderService {
  private browser: puppeteer.Browser | null = null;

  private static readonly BELGRADE_LATITUDE = 44.8125;
  private static readonly BELGRADE_LONGITUDE = 20.4612;
  async geocode(address: string): Promise<{
    latitude: number;
    longitude: number;
    display_name: string;
  }> {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'Tulum Host App',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!results || results.length === 0) {
      throw new Error('No results found for address');
    }

    const { lat, lon, display_name } = results[0];
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      display_name,
    };
  }

  async extractCoordinates(html: string): Promise<{
    latitude: number;
    longitude: number;
  }> {
    const match = html.match(/href=["'](https?:\/\/[^"']*maps[^"']*)["']/i);

    if (match?.[1]) {
      const directCoordinates = this.extractCoordinatesFromUrl(match[1]);

      if (directCoordinates) {
        return directCoordinates;
      }

      const resolvedUrl = await this.resolveMapsUrl(match[1]);

      if (resolvedUrl) {
        const resolvedCoordinates = this.extractCoordinatesFromUrl(resolvedUrl);

        if (resolvedCoordinates) {
          return resolvedCoordinates;
        }
      }
    }

    return {
      latitude: GeocoderService.BELGRADE_LATITUDE,
      longitude: GeocoderService.BELGRADE_LONGITUDE,
    };
  }

  extractCoordinatesFromUrl(url: string): {
    latitude: number;
    longitude: number;
  } | null {
    const atCoordinates = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

    if (atCoordinates) {
      return {
        latitude: Number(atCoordinates[1]),
        longitude: Number(atCoordinates[2]),
      };
    }

    const bangCoordinates = url.match(
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    );

    if (bangCoordinates) {
      return {
        latitude: Number(bangCoordinates[1]),
        longitude: Number(bangCoordinates[2]),
      };
    }

    return null;
  }
  async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }

    return this.browser;
  }
  async resolveMapsUrl(url: string): Promise<string | null> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        await page.goto(url, {
          waitUntil: 'load',
          timeout: 30_000,
        });

        return page.url();
      } finally {
        await page.close();
      }
    } catch {
      // this.logs.warning(
      //   `Failed to resolve maps URL ${url}: ` + this.getErrorMessage(error),
      // );

      return null;
    }
  }
}
