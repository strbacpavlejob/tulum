import { Event } from "@/types/event";
import { Filter } from "@/types/filter";
import { User } from "@/types/user";

const TULUM_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

interface ActiveEventResponse {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  type: string;
  capacity: number;
  address: string;
  description: string;
  picture: string | null;
  venue_picture: string | null;
  picture_urls: string[];
  date: string;
  tags: string[];
  isFavorite: boolean;
  isSeen: boolean;
  isAttending: boolean;
}

function mapActiveEventToEvent(item: ActiveEventResponse): Event {
  return {
    id: item.id,
    image: item.picture ?? item.venue_picture ?? item.picture_urls[0] ?? "",
    venue_picture: item.venue_picture,
    title: item.name,
    description: item.description ?? "",
    date: item.date,
    tags: item.tags ?? [],
    location: {
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address,
    },
    isFavorite: item.isFavorite ?? false,
    isSeen: item.isSeen ?? false,
    isAttending: item.isAttending ?? false,
    guests: [],
    price: 0,
  };
}

export interface FetchActiveEventsParams {
  filter?: Partial<Filter>;
  userId?: string;
}

export async function fetchActiveEvents(
  params?: FetchActiveEventsParams,
): Promise<Event[]> {
  const { filter, userId } = params ?? {};
  const query = new URLSearchParams();

  if (filter?.venueType) query.set("venue_type", filter.venueType);
  if (filter?.capacityRange?.min != null)
    query.set("capacity_min", String(filter.capacityRange.min));
  if (filter?.capacityRange?.max != null)
    query.set("capacity_max", String(filter.capacityRange.max));
  if (filter?.dateRange?.start)
    query.set("date_start", new Date(filter.dateRange.start).toISOString());
  if (filter?.dateRange?.end)
    query.set("date_end", new Date(filter.dateRange.end).toISOString());
  if (filter?.isOnlyFavorite && userId) {
    query.set("only_favorites", "true");
    query.set("user_id", userId);
  }

  const qs = query.toString();
  const url = `${TULUM_API_URL}/events/active${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    headers: userId ? authHeaders(userId) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch active events: ${response.status}`);
  }
  const data: ActiveEventResponse[] = await response.json();
  return data.map(mapActiveEventToEvent);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

interface MyProfileResponse {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  guest: {
    gender: "male" | "female" | "other" | null;
    seeking: string | null;
    interested_in: ("male" | "female" | "other")[];
    interests: string[];
    picture_urls: string[];
    birthday: string | null;
  } | null;
}

export function mapProfileToUser(raw: MyProfileResponse): User {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.first_name ?? undefined,
    lastName: raw.last_name ?? undefined,
    imgUrl: raw.avatar_url ?? undefined,
    photos: raw.guest?.picture_urls ?? [],
    gender: raw.guest?.gender ?? undefined,
    birthday: raw.guest?.birthday
      ? raw.guest.birthday.split("T")[0]
      : undefined,
    interests: raw.guest?.interests ?? [],
    tags: raw.guest?.interests ?? [],
  };
}

export async function fetchMyProfile(userId: string): Promise<User> {
  const url = `${TULUM_API_URL}/users/me?user_id=${encodeURIComponent(userId)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.status}`);
  }
  const data: MyProfileResponse = await response.json();
  return mapProfileToUser(data);
}

export async function updateMyProfile(
  userId: string,
  userUpdates: Record<string, unknown>,
  guestUpdates: Record<string, unknown>,
): Promise<User> {
  const url = `${TULUM_API_URL}/users/me`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      user: userUpdates,
      guest: guestUpdates,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update profile: ${response.status}`);
  }
  const data: MyProfileResponse = await response.json();
  return mapProfileToUser(data);
}

// ─── Guest onboarding ─────────────────────────────────────────────────────────

export type GenderValue = "male" | "female" | "other";
export type SeekingValue = "casual" | "relationship" | "friendship" | "party";

export interface GuestProfile {
  user_id: string;
  gender: GenderValue | null;
  seeking: SeekingValue | null;
  interested_in: GenderValue[];
  interests: string[];
  picture_urls: string[];
  birthday: string;
}

export interface GuestMeResponse {
  guest: GuestProfile | null;
  isOnboardingComplete: boolean;
}

export interface OnboardingPayload {
  gender: GenderValue;
  seeking: SeekingValue;
  interested_in: GenderValue[];
  interests?: string[];
  picture_urls?: string[];
  birthday: string;
}

function authHeaders(userId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-user-id": userId,
  };
}

export async function fetchGuestMe(userId: string): Promise<GuestMeResponse> {
  const url = `${TULUM_API_URL}/guests/me`;
  const response = await fetch(url, { headers: authHeaders(userId) });
  if (!response.ok) {
    throw new Error(`Failed to fetch guest profile: ${response.status}`);
  }
  return response.json() as Promise<GuestMeResponse>;
}

export async function submitOnboarding(
  userId: string,
  payload: OnboardingPayload,
): Promise<GuestMeResponse> {
  const url = `${TULUM_API_URL}/guests/onboarding`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to submit onboarding: ${response.status} ${body}`);
  }
  return response.json() as Promise<GuestMeResponse>;
}

// ─── Chats ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  chat_id: number;
  sender_id: string;
  text: string;
  sent_at: string;
}

export interface ChatOpenResponse {
  chat: {
    id: number;
    match_id: number;
    event_id: number | null;
    created_at: string;
  };
  messages: ChatMessage[];
}

export async function fetchOrCreateChat(
  matchId: string | number,
  userId: string,
): Promise<ChatOpenResponse> {
  const url = `${TULUM_API_URL}/chats/by-match/${matchId}`;
  const response = await fetch(url, { headers: authHeaders(userId) });
  if (!response.ok) {
    throw new Error(`Failed to open chat: ${response.status}`);
  }
  return response.json() as Promise<ChatOpenResponse>;
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export interface MatchListItem {
  id: number;
  matched_at: string;
  chat_id: number | null;
  has_messages: boolean;
  last_message: {
    id: number;
    text: string;
    sender_id: string;
    sent_at: string;
  } | null;
  other_guest: {
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    picture_urls: string[];
    birthday: string | null;
    interests: string[];
  };
  event: {
    id: number;
    title: string;
    venue_name: string | null;
  } | null;
}

export async function fetchMyMatches(userId: string): Promise<MatchListItem[]> {
  const url = `${TULUM_API_URL}/matches/mine`;
  const response = await fetch(url, { headers: authHeaders(userId) });
  if (!response.ok) {
    throw new Error(`Failed to fetch matches: ${response.status}`);
  }
  return response.json() as Promise<MatchListItem[]>;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function trackEventSeen(
  userId: string,
  eventId: string | number,
): Promise<void> {
  const url = `${TULUM_API_URL}/favorites/seen`;
  await fetch(url, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({ event_id: Number(eventId) }),
  });
}

export async function toggleFavorite(
  userId: string,
  eventId: string | number,
): Promise<{ isFavorite: boolean }> {
  const url = `${TULUM_API_URL}/favorites/toggle`;
  const response = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders(userId), "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: Number(eventId) }),
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle favorite: ${response.status}`);
  }
  return response.json() as Promise<{ isFavorite: boolean }>;
}

export async function attendEvent(
  userId: string,
  eventId: string | number,
): Promise<{ ticket: Record<string, unknown>; isNew: boolean }> {
  const url = `${TULUM_API_URL}/tickets/attend`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({ event_id: Number(eventId) }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body?.message ?? `Failed to attend event: ${response.status}`;
    throw new Error(message);
  }
  return response.json();
}

export async function unattendEvent(
  userId: string,
  eventId: string | number,
): Promise<void> {
  const url = `${TULUM_API_URL}/tickets/attend?event_id=${Number(eventId)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(userId),
  });
  if (!response.ok) {
    throw new Error(`Failed to unattend event: ${response.status}`);
  }
}

export async function fetchMyTickets(userId: string) {
  const url = `${TULUM_API_URL}/tickets?guest_id=${encodeURIComponent(userId)}`;
  const response = await fetch(url, { headers: authHeaders(userId) });
  if (!response.ok) {
    throw new Error(`Failed to fetch tickets: ${response.status}`);
  }
  const data = await response.json();
  return data.map((t: any) => ({
    ...t,
    location: {
      latitude: t.latitude,
      longitude: t.longitude,
      address: t.address,
    },
  }));
}

export interface SwipeableProfile {
  user_id: string;
  event_id: number;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  picture_urls: string[];
  age: number;
  interests: string[];
}

export interface SwipeableResponse {
  event_id: number | null;
  event_title: string;
  event_venue: string;
  profiles: SwipeableProfile[];
}

export async function fetchSwipeableProfiles(
  userId: string,
  eventId?: number,
): Promise<SwipeableResponse> {
  const qs = eventId ? `?event_id=${eventId}` : "";
  const url = `${TULUM_API_URL}/guests/swipeable${qs}`;
  const response = await fetch(url, { headers: authHeaders(userId) });
  if (!response.ok) {
    throw new Error(`Failed to fetch swipeable profiles: ${response.status}`);
  }
  return response.json() as Promise<SwipeableResponse>;
}

export async function createMatchSwipe(
  userId: string,
  otherUserId: string,
  eventId: number,
): Promise<void> {
  const url = `${TULUM_API_URL}/matches`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({
      guest_id_1: userId,
      guest_id_2: otherUserId,
      event_id: eventId,
    }),
  });
  // 409 / 23505 means the match already exists — ignore
  if (!response.ok && response.status !== 409) {
    throw new Error(`Failed to create match: ${response.status}`);
  }
}
