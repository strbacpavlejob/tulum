export enum VenueTypeEnum {
  BAR = 'bar',
  PUB = 'pub',
  NIGHTCLUB = 'nightclub',
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  COCKTAIL_BAR = 'cocktail_bar',
  WINE_BAR = 'wine_bar',
  BREWERY = 'brewery',
  TAVERN = 'tavern',
  RAFT = 'raft',
}

export interface Venue {
  id: string; // UUID

  hostId: string;
  venueType: VenueTypeEnum;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: Date;
  updatedAt: Date;
  capacity: number | null;
  pictureUrl: string | null;
  scraper: string | null;
  contactId: string | null; // UUID
  requiresReservation: boolean;
  minAgeMale: number;
  minAgeFemale: number;
}
