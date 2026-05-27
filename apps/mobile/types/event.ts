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

export interface Event {
  id: string;
  image: string;
  venue_picture: string | null;
  title: string;
  description: string;
  date: string;
  tags: string[];
  location: EventLocation;
  isFavorite: boolean;
  isSeen: boolean;
  isAttending: boolean;
  guests: EventGuests[];
  comment?: EventComment[];
  price: number;
  venueContact: VenueContact | null;
  requiresReservation: boolean;
}
