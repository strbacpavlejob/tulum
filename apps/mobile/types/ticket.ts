import { EventLocation } from "./event";

export interface Ticket {
  id: string;
  event_id: string;
  guest_count?: number;
  image: string | null;
  title: string;
  description: string;
  date: string;
  tags: string[];
  venue_name: string;
  location: EventLocation;
}
