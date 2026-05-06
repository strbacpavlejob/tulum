import { EventComment, EventGuests, EventLocation } from "./event";

export interface Ticket {
  id: string;
  image: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  location: EventLocation;
  isFavorite: boolean;
  guests: EventGuests[];
  comment?: EventComment[];
  price: number;
}
