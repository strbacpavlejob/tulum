import { describe, expect, it } from '@jest/globals';
import { SCRAPER_CONFIGS, ScraperSource } from './scraper-config';
import { VenueTypeEnum } from './scraper-venue.interfaces';

describe('scraper venue type mappings', () => {
  const getMappings = (source: ScraperSource) =>
    new Map(
      SCRAPER_CONFIGS[source].venues.venueTypeMapping.map(
        ({ queryValue, venueType }) => [String(queryValue), venueType],
      ),
    );

  it('exposes only the six supported venue types', () => {
    expect(Object.values(VenueTypeEnum)).toEqual([
      'bar',
      'club',
      'restaurant',
      'tavern',
      'cafe',
      'event_venue',
    ]);
  });

  it('maps legacy scraper categories to their simplified venue types', () => {
    expect(getMappings(ScraperSource.GOOUT)).toEqual(
      new Map([
        ['7058', VenueTypeEnum.RESTAURANT],
        ['7059', VenueTypeEnum.BAR],
        ['7060', VenueTypeEnum.CLUB],
        ['7061', VenueTypeEnum.CLUB],
        ['7062', VenueTypeEnum.TAVERN],
      ]),
    );
    expect(getMappings(ScraperSource.GUEST_LIST)).toEqual(
      new Map([
        ['Nightclub', VenueTypeEnum.CLUB],
        ['Tavern', VenueTypeEnum.TAVERN],
        ['Restaurant', VenueTypeEnum.RESTAURANT],
      ]),
    );
    expect(getMappings(ScraperSource.INSTAGRAM)).toEqual(
      new Map([['Nightclub', VenueTypeEnum.CLUB]]),
    );
  });
});
