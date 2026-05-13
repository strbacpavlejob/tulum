export interface EventGuests {
  name: string;
  age: number;
  uri: string;
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
  guests: EventGuests[];
  comment?: EventComment[];
  price: number;
}
