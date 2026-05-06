import { Injectable } from '@nestjs/common';

@Injectable()
export class GeocoderService {
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
}
