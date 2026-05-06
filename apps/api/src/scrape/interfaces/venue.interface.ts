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

export interface Venue {
  id: number;
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
  instagram_url?: string;
  created_at?: string;
  updated_at?: string;
}
