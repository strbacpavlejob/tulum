export type VenueType =
  | "bar"
  | "pub"
  | "nightclub"
  | "restaurant"
  | "cafe"
  | "cocktail_bar"
  | "wine_bar"
  | "brewery"
  | "tavern"
  | "raft";

export interface Filter {
  title: string;
  tags: string[];
  venueType: VenueType[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  guestsLimit: number | null;
  isOnlyFavorite: boolean;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  capacityRange: {
    min: number | null;
    max: number | null;
  };
  // location: {
  //   latitude: number | null;
  //   longitude: number | null;
  //   radius: number | null; // in kilometers
  // };
}
