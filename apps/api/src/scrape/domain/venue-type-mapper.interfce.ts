import { ScraperSource } from './scraper-config';
import { VenueTypeEnum } from './scraper-venue.interfaces';

export interface VenueTypeMapping {
  /**
   * Raw venue type returned by the scraper.
   * Example: "Nightclub"
   */
  queryValue: string;

  /**
   * Internal venue type.
   */
  venueType: VenueTypeEnum;
}

export interface VenueTypeMapper {
  mapVenueType(
    scraperSource: ScraperSource,
    scraperVenueType: string,
  ): VenueTypeEnum | null;
}
