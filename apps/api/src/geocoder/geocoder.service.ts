import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Coordinates, toCoordinates } from './coordinates';

// Nominatim's usage policy allows at most one request per second.
const NOMINATIM_REQUEST_INTERVAL_MS = 1_000;
// place_rank 28-30 is a house number, building or POI. Streets rank 26-27 and
// areas lower (a city is 25 or less); their point is not where a venue is.
const MIN_VENUE_PLACE_RANK = 28;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_rank?: number;
}

@Injectable()
export class GeocoderService {
  private browser: puppeteer.Browser | null = null;
  private nextNominatimRequestAt = 0;

  async geocode(address: string): Promise<{
    latitude: number;
    longitude: number;
    display_name: string;
  }> {
    const { lat, lon, display_name } = await this.searchNominatim(address);
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      display_name,
    };
  }

  private async searchNominatim(
    address: string,
    countryCode?: string,
  ): Promise<NominatimResult> {
    await this.waitForNominatimTurn();

    const countryFilter =
      countryCode && /^[a-z]{2}$/i.test(countryCode)
        ? `&countrycodes=${countryCode.toLowerCase()}`
        : '';
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1${countryFilter}`,
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

    const results = (await response.json()) as NominatimResult[];

    if (!results || results.length === 0) {
      throw new Error('No results found for address');
    }

    return results[0];
  }

  /** Takes the next free Nominatim slot, one per second, and waits for it. */
  private async waitForNominatimTurn(): Promise<void> {
    const now = Date.now();
    const turnAt = Math.max(now, this.nextNominatimRequestAt);

    this.nextNominatimRequestAt = turnAt + NOMINATIM_REQUEST_INTERVAL_MS;

    if (turnAt > now) {
      await new Promise((resolve) => setTimeout(resolve, turnAt - now));
    }
  }

  /**
   * Coordinates of a venue's street address, or null when Nominatim fails or
   * only matches something larger than an address, such as a street or city.
   */
  async geocodeVenueAddress(
    address: string,
    countryCode?: string,
  ): Promise<Coordinates | null> {
    try {
      const result = await this.searchNominatim(address, countryCode);

      return (result.place_rank ?? 0) >= MIN_VENUE_PLACE_RANK
        ? toCoordinates(result.lat, result.lon)
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Coordinates from the page's first Google Maps link, or null when it has
   * no such link or none we can read.
   */
  async extractCoordinates(html: string): Promise<Coordinates | null> {
    const href = html.match(/href=["'](https?:\/\/[^"']*maps[^"']*)["']/i)?.[1];

    if (!href) {
      return null;
    }

    // The href is HTML, so its &amp; is a plain & in the URL.
    const url = href.replace(/&amp;/gi, '&');
    const directCoordinates = this.extractCoordinatesFromUrl(url);

    if (directCoordinates) {
      return directCoordinates;
    }

    const resolvedUrl = await this.resolveMapsUrl(url);

    return resolvedUrl ? this.extractCoordinatesFromUrl(resolvedUrl) : null;
  }

  extractCoordinatesFromUrl(url: string): Coordinates | null {
    // Decoded, %2C and %2B match as well, and so does the maps URL inside a
    // consent page's continue parameter.
    const decodedUrl = safeDecodeURIComponent(url);

    // The place's own pin. The @ pair is only where the map is centred,
    // which can be far from the place.
    const pin = decodedUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

    if (pin) {
      return toCoordinates(pin[1], pin[2]);
    }

    // Coordinates as the search itself: /maps/search/44.83,+20.45 (where
    // maps.app.goo.gl links redirect) or ?q=44.83,20.45.
    const searched = decodedUrl.match(
      /(?:\/search\/|[?&](?:q|query|ll|destination)=)(-?\d{1,3}\.\d+),[+\s]*(-?\d{1,3}\.\d+)/,
    );

    if (searched) {
      return toCoordinates(searched[1], searched[2]);
    }

    // A text search's map is centred on its results, not on the venue.
    if (decodedUrl.includes('/maps/search/')) {
      return null;
    }

    const viewport = decodedUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

    return viewport ? toCoordinates(viewport[1], viewport[2]) : null;
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

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
