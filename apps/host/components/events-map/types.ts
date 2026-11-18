import type { Event } from "@/store/events";
import type { Venue } from "@/store/venues";

export type EventWithLocation = Event & {
  longitude: number;
  latitude: number;
  venue_name?: string;
  venue_picture?: string;
  venue: Venue;
};
