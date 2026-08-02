import { EventStatusEnum } from './scraper-event.interfaces';
import { VenueTypeEnum } from './scraper-venue.interfaces';

export enum ScraperSource {
  GOOUT = 'goout',
  GUEST_LIST = 'guest_list',
  INSTAGRAM = 'instagram',
}

export enum ImageStoragePolicy {
  KEEP_EMPTY = 'keep_empty',
  KEEP_EXTERNAL_URL = 'keep_external_url',
  UPLOAD_TO_R2 = 'upload_to_r2',
  UPLOAD_TO_R2_IF_MISSING = 'upload_to_r2_if_missing',
}

export interface VenueTypeMapping {
  /**
   * Raw venue type returned by the scraper.
   * Example: "Nightclub"
   */
  queryValue: string | number;

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

export interface ScraperConfig {
  id: number;
  baseUrl: string;
  source: ScraperSource;

  tokenFetchDelay?: number; // Delay in milliseconds between token fetches

  events: {
    imagePolicy: ImageStoragePolicy;
    defaultStatus: EventStatusEnum;
    checkDuplicates?: boolean;
    fetchDelay?: number; // Delay in milliseconds between fetches to avoid rate limiting
    defuaultDurationHours?: 4;
    //updateExistingVenues?: boolean;
  };
  venues: {
    defuaultCapacity?: 100;
    imagePolicy: ImageStoragePolicy;
    hasAgeRestriction?: boolean;
    checkDuplicates?: boolean;
    scrapeContacts?: boolean;
    venueTypeMapping: VenueTypeMapping[];
    fetchDelay?: number; // Delay in milliseconds between fetches to avoid rate limiting
    //updateExistingVenues?: boolean;
  };
}

export const SCRAPER_CONFIGS: Record<ScraperSource, ScraperConfig> = {
  [ScraperSource.GOOUT]: {
    id: 1,
    baseUrl: 'https://appserver.goout.rs/api/v1',
    source: ScraperSource.GOOUT,
    tokenFetchDelay: 30_000,

    events: {
      imagePolicy: ImageStoragePolicy.KEEP_EXTERNAL_URL,
      defaultStatus: EventStatusEnum.ACTIVE,
      fetchDelay: 2000,
    },
    venues: {
      imagePolicy: ImageStoragePolicy.UPLOAD_TO_R2,
      venueTypeMapping: [
        {
          queryValue: 7058,
          venueType: VenueTypeEnum.RESTAURANT,
        },
        {
          queryValue: 7059,
          venueType: VenueTypeEnum.BAR,
        },
        {
          queryValue: 7060,
          venueType: VenueTypeEnum.NIGHTCLUB,
        },
        {
          queryValue: 7061,
          venueType: VenueTypeEnum.RAFT,
        },
        {
          queryValue: 7062,
          venueType: VenueTypeEnum.TAVERN,
        },
      ],
    },
  },

  [ScraperSource.GUEST_LIST]: {
    id: 2,
    baseUrl: 'https://guestlist-serbia.com/',
    source: ScraperSource.GUEST_LIST,

    events: {
      imagePolicy: ImageStoragePolicy.KEEP_EMPTY,
      defaultStatus: EventStatusEnum.ACTIVE,
    },
    venues: {
      imagePolicy: ImageStoragePolicy.KEEP_EMPTY,
      venueTypeMapping: [
        { queryValue: 'Nightclub', venueType: VenueTypeEnum.NIGHTCLUB },
        { queryValue: 'Tavern', venueType: VenueTypeEnum.TAVERN },
        { queryValue: 'Restaurant', venueType: VenueTypeEnum.RESTAURANT },
      ],
    },
  },

  [ScraperSource.INSTAGRAM]: {
    id: 3,
    baseUrl: 'https://storiesig.info/en/',
    source: ScraperSource.INSTAGRAM,

    events: {
      imagePolicy: ImageStoragePolicy.KEEP_EXTERNAL_URL,
      defaultStatus: EventStatusEnum.DRAFT,
    },
    venues: {
      imagePolicy: ImageStoragePolicy.KEEP_EXTERNAL_URL,
      venueTypeMapping: [
        { queryValue: 'Nightclub', venueType: VenueTypeEnum.NIGHTCLUB },
      ],
    },
  },
};
