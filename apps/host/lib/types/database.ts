// Database types based on PostgreSQL schema

export type EventStatus = "draft" | "active" | "cancelled";
export type Gender = "male" | "female" | "other";
export type Language = "EN" | "SR" | "RU";
export type Seeking = "casual" | "relationship" | "friendship" | "party";
export type Theme = "dark" | "light" | "system";
export type TransactionMode = "transfer" | "purchase";
export type TransactionStatus = "pending" | "completed" | "failed";
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

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  push_token?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Guest {
  user_id: string;
  gender?: Gender;
  seeking?: Seeking;
  interested_in: Gender[];
  interests: string[];
  picture_urls: string[];
  birthday: string;
}

export interface Host {
  user_id: string;
}

export interface Settings {
  user_id: string;
  language: Language;
  theme: Theme;
}

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

export interface Favorite {
  id?: string;
  user_id: string;
  event_id: string;
  created_at?: string;
}

export interface Ticket {
  id?: string;
  event_id: string;
  guest_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Match {
  id?: number;
  guest_id_1: string;
  guest_id_2: string;
  event_id: string;
  matched_at?: string;
}

export interface Chat {
  id?: string;
  match_id: number;
  event_id: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: string;
  chat_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  sent_at?: string;
}
