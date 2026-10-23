import { VenueContact } from './scraper-venue-contact.interfaces';

export enum VenueTypeEnum {
  BAR = 'bar',
  CLUB = 'club',
  RESTAURANT = 'restaurant',
  TAVERN = 'tavern',
  CAFE = 'cafe',
  EVENT_VENUE = 'event_venue',
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
  venueContacts: VenueContact | null;
  requiresReservation: boolean;
  minAgeMale: number;
  minAgeFemale: number;
}
