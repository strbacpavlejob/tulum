// Database types based on PostgreSQL schema

export type EventStatus = "draft" | "active" | "cancelled";
export type VenueType =
  | "bar"
  | "club"
  | "restaurant"
  | "tavern"
  | "cafe"
  | "event_venue";

export interface Venue {
  id?: string;
  host_id: string;
  venue_type: VenueType;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address: string;
  capacity?: number;
  picture_url?: string;
  picture_urls?: string[]; // Legacy field for backward compatibility
  requires_reservation?: boolean;
  contact_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Event {
  id?: string;
  venue_id: string;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  picture_url?: string;
  status: EventStatus;
  created_at?: string;
  updated_at?: string;
}

