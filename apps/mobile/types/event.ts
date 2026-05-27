export interface VenueContact {
  id: string;
  phoneNumber: string;
  isViber: boolean;
  isPhone: boolean;
  isSms: boolean;
  isWhatsapp: boolean;
  isInstagram: boolean;
  instagramHandle: string | null;
}

export interface EventGuests {
  name: string;
  age: number | null;
  uri: string | null;
  gender: "male" | "female" | "other" | null;
}

export interface EventLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface EventUser {
  firstName: string;
  lastName: string;
  avatar: string;
}

export interface EventComment {
  user: EventUser;
  host: EventUser;
  text: string;
  date: Date;
  rating: number;
}

/** Lightweight event data used in lists, maps, and cards */
export interface EventSummary {
  id: string;
  image: string;
  title: string;
  venueName: string;
  address: string;
  isFavorite: boolean;
  date: string;
  guestCount: number;
  tags: string[];
  location: EventLocation;
}

/** Full event details fetched from the detail endpoint */
export interface Event extends EventSummary {
  venue_picture: string | null;
  description: string;
  isSeen: boolean;
  isAttending: boolean;
  price: number;
  venueContact: VenueContact | null;
  requiresReservation: boolean;
}
