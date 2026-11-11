/**
 * Instagram venues are never stored at 0,0. geocodeAddress() used to return
 * 0,0 whenever Nominatim found nothing, and 48 venues were saved there, off
 * the coast of Africa on the map.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Coordinates } from '../geocoder/coordinates';
import { GeocoderService } from '../geocoder/geocoder.service';
import { R2Service } from '../r2/r2.service';
import { RedisService } from '../redis/redis.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  InstagramVenueData,
  InstagramVenueProfile,
  InstagramVenueScraperService,
} from './instagram-venue-scraper.service';

const profile = (
  overrides: Partial<InstagramVenueProfile> = {},
): InstagramVenueProfile => ({
  username: 'umami.bg',
  fullName: 'UMAMI | Cocktail bar',
  biography: null,
  website: null,
  phoneNumber: null,
  isWhatsappLinked: false,
  email: null,
  profilePictureUrl: 'https://cdn.example/umami.jpg',
  address: 'UMAMI, Žorža Klemensoa 29b',
  ...overrides,
});

const setup = (data: InstagramVenueData, coordinates: Coordinates | null) => {
  const geocoder = {
    geocodeVenueAddress: jest
      .fn<
        (address: string, countryCode?: string) => Promise<Coordinates | null>
      >()
      .mockResolvedValue(coordinates),
  };
  const r2Service = {
    downloadAndUpload: jest
      .fn<(url: string, key: string) => Promise<string | null>>()
      .mockResolvedValue('https://r2.example/profile.webp'),
  };
  const supabaseService = {
    saveScrapedData: jest
      .fn<
        (data: {
          venues: unknown[];
          events: unknown[];
        }) => Promise<{ venues: number; events: number }>
      >()
      .mockResolvedValue({ venues: 0, events: 0 }),
  };

  const service = new InstagramVenueScraperService(
    supabaseService as unknown as SupabaseService,
    r2Service as unknown as R2Service,
    {} as RedisService,
    geocoder as unknown as GeocoderService,
  );
  jest.spyOn(service, 'scrapeVenue').mockResolvedValue(data);

  return { service, geocoder, r2Service, supabaseService };
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('InstagramVenueScraperService venue coordinates', () => {
  it("stores the point found for the profile's street address", async () => {
    const { service, geocoder } = setup(
      { profile: profile(), posts: [] },
      { latitude: 44.81, longitude: 20.47 },
    );

    const { venue } = await service.scrapeNewVenue('umami.bg');

    expect(venue).toMatchObject({
      name: 'UMAMI | Cocktail bar',
      address: 'Žorža Klemensoa 29b',
      latitude: 44.81,
      longitude: 20.47,
    });
    expect(geocoder.geocodeVenueAddress).toHaveBeenCalledWith(
      'Žorža Klemensoa 29b, Belgrade',
      'RS',
    );
  });

  it('refuses to build a venue it cannot locate instead of putting it at 0,0', async () => {
    const { service, r2Service } = setup(
      { profile: profile(), posts: [] },
      null,
    );

    await expect(service.scrapeNewVenue('umami.bg')).rejects.toThrow(
      '@umami.bg: no coordinates for "Žorža Klemensoa 29b", so its venue is not saved',
    );
    expect(r2Service.downloadAndUpload).not.toHaveBeenCalled();
  });

  it('looks the name up when the profile has no street address, and still never uses 0,0', async () => {
    const { service, geocoder } = setup(
      {
        profile: profile({
          username: 'vinyl.belgrade',
          fullName: 'Vinyl Nightclub Belgrade',
          address: null,
        }),
        posts: [],
      },
      null,
    );

    await expect(service.scrapeNewVenue('vinyl.belgrade')).rejects.toThrow(
      'no coordinates for "Vinyl Nightclub Belgrade"',
    );
    expect(geocoder.geocodeVenueAddress).toHaveBeenCalledWith(
      'Vinyl Nightclub Belgrade, Belgrade',
      'RS',
    );
  });

  it('saves nothing for a profile it cannot locate when scraping all venues', async () => {
    const { service, supabaseService } = setup(
      {
        profile: profile({
          username: 'freestylerbelgrade_official',
          fullName: 'Freestyler',
          address: null,
        }),
        posts: [{ imageUrl: null, description: 'Subota 31.10. 23h' }],
      },
      null,
    );

    await service.scrapeAllVenues();

    expect(supabaseService.saveScrapedData).toHaveBeenCalledWith({
      venues: [],
      events: [],
    });
  });
});
