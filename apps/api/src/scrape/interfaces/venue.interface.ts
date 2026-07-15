export type VenueType =
  | 'bar'
  | 'pub'
  | 'nightclub'
  | 'restaurant'
  | 'cafe'
  | 'cocktail_bar'
  | 'wine_bar'
  | 'brewery'
  | 'tavern'
  | 'raft';

export interface VenueContact {
  phone_number: string;
  is_viber: boolean;
  is_phone: boolean;
  is_sms: boolean;
  is_whatsapp: boolean;
  is_instagram?: boolean;
  instagram_handle?: string | null;
}

export interface Venue {
  id: string;
  host_id?: string;
  name: string;
  longitude: number;
  latitude: number;
  type: VenueType;
  capacity: number;
  address?: string;
  description?: string;
  picture?: string;
  picture_urls?: string[];
  scraper?: string;
  min_age_male?: number;
  min_age_female?: number;
  contact?: VenueContact | null;
  created_at?: string;
  updated_at?: string;
}
