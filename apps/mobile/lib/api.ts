import { Platform } from "react-native";
import { Event, VenueContact } from "@/types/event";
import { Filter } from "@/types/filter";
import { User } from "@/types/user";

const TULUM_API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

interface ActiveEventVenueContact {
  id: number;
  phone_number: string;
  is_viber: boolean;
  is_phone: boolean;
  is_sms: boolean;
  is_whatsapp: boolean;
  instagram_handle: string | null;
}

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
  venue_instagram_url: string | null;
  venue_contact: ActiveEventVenueContact | null;
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
    venueContact: item.venue_contact
      ? ({
          id: item.venue_contact.id,
          phoneNumber: item.venue_contact.phone_number,
          isViber: item.venue_contact.is_viber,
          isPhone: item.venue_contact.is_phone,
          isSms: item.venue_contact.is_sms,
          isWhatsapp: item.venue_contact.is_whatsapp,
          instagramHandle: item.venue_contact.instagram_handle,
        } as VenueContact)
      : item.venue_instagram_url
        ? ({
            id: 0,
            phoneNumber: "",
            isViber: false,
            isPhone: false,
            isSms: false,
            isWhatsapp: false,
            instagramHandle:
              item.venue_instagram_url.replace(/\/+$/, "").split("/").pop() ??
              null,
          } as VenueContact)
        : null,
  };
}

export interface FetchActiveEventsParams {
  filter?: Partial<Filter>;
  token?: string;
  userId?: string;
}

export async function fetchActiveEvents(
  params?: FetchActiveEventsParams,
): Promise<Event[]> {
  const { filter, token, userId } = params ?? {};
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
  if (userId) query.set("user_id", userId);
  if (filter?.isOnlyFavorite && userId) {
    query.set("only_favorites", "true");
  }

  const qs = query.toString();
  const url = `${TULUM_API_URL}/events/active${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    headers: token ? authHeaders(token) : undefined,
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

export async function fetchMyProfile(
  token: string,
  userId: string,
): Promise<User> {
  const url = `${TULUM_API_URL}/users/me?user_id=${encodeURIComponent(userId)}`;
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.status}`);
  }
  const data: MyProfileResponse = await response.json();
  return mapProfileToUser(data);
}

export async function updateMyProfile(
  token: string,
  userId: string,
  userUpdates: Record<string, unknown>,
  guestUpdates: Record<string, unknown>,
): Promise<User> {
  const url = `${TULUM_API_URL}/users/me`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
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

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchGuestMe(token: string): Promise<GuestMeResponse> {
  const url = `${TULUM_API_URL}/guests/me`;
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to fetch guest profile: ${response.status}`);
  }
  return response.json() as Promise<GuestMeResponse>;
}

export async function submitOnboarding(
  token: string,
  payload: OnboardingPayload,
): Promise<GuestMeResponse> {
  const url = `${TULUM_API_URL}/guests/onboarding`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to submit onboarding: ${response.status} ${body}`);
  }
  return response.json() as Promise<GuestMeResponse>;
}

// ─── Guest photos ─────────────────────────────────────────────────────────────

/**
 * Upload a single profile photo. The server compresses it to 800×600 WebP
 * (~200 KB) using sharp and stores it in R2.
 * Returns the full updated picture_urls array (up to 3 photos).
 */
export async function uploadGuestPhoto(
  token: string,
  fileUri: string,
  mimeType: string = "image/jpeg",
): Promise<string[]> {
  if (Platform.OS === "web") {
    // In the browser (Expo Web), the asset URI is a data: or blob: URL.
    // FormData requires an actual File/Blob — appending a plain object
    // would stringify it as "[object Object]", causing a 400 on the server.
    const res = await fetch(fileUri);
    const blob = await res.blob();
    const file = new File([blob], "photo.jpg", { type: mimeType });

    const formData = new FormData();
    formData.append("photo", file);

    const response = await fetch(`${TULUM_API_URL}/guests/photos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      // Do NOT set Content-Type — the browser sets it with the correct boundary.
      body: formData,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to upload photo: ${response.status} ${text}`);
    }
    const data = (await response.json()) as { picture_urls: string[] };
    return data.picture_urls;
  }

  // React Native (iOS / Android): XHR is used instead of fetch because
  // React Native's fetch does not reliably set the multipart/form-data
  // boundary, causing multer on the server to miss the file entirely.
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("photo", {
      uri: fileUri,
      name: "photo.jpg",
      type: mimeType,
    } as unknown as Blob);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${TULUM_API_URL}/guests/photos`);
    // Do NOT set Content-Type manually — XHR sets it with the correct boundary.
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as { picture_urls: string[] };
        resolve(data.picture_urls);
      } else {
        reject(
          new Error(
            `Failed to upload photo: ${xhr.status} ${xhr.responseText}`,
          ),
        );
      }
    };
    xhr.onerror = () =>
      reject(new Error("Network error while uploading photo"));
    xhr.send(formData);
  });
}

/**
 * Delete a profile photo by its R2 URL.
 * Returns the full updated picture_urls array.
 */
export async function deleteGuestPhoto(
  token: string,
  url: string,
): Promise<string[]> {
  const response = await fetch(`${TULUM_API_URL}/guests/photos`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to delete photo: ${response.status} ${body}`);
  }
  const data = (await response.json()) as { picture_urls: string[] };
  return data.picture_urls;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface RemoteSettings {
  language: "EN" | "RS" | "RU";
  theme: "light" | "dark" | "system";
}

export async function fetchSettings(
  token: string,
  userId: string,
): Promise<RemoteSettings | null> {
  const url = `${TULUM_API_URL}/settings/me?user_id=${encodeURIComponent(userId)}`;
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to fetch settings: ${response.status}`);
  }
  return response.json() as Promise<RemoteSettings | null>;
}

export async function updateSettings(
  token: string,
  userId: string,
  patch: Partial<RemoteSettings>,
): Promise<RemoteSettings> {
  const url = `${TULUM_API_URL}/settings/me?user_id=${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(`Failed to update settings: ${response.status}`);
  }
  return response.json() as Promise<RemoteSettings>;
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
  token: string,
): Promise<ChatOpenResponse> {
  const url = `${TULUM_API_URL}/chats/by-match/${matchId}`;
  const response = await fetch(url, { headers: authHeaders(token) });
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

export async function fetchMyMatches(token: string): Promise<MatchListItem[]> {
  const url = `${TULUM_API_URL}/matches/mine`;
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to fetch matches: ${response.status}`);
  }
  return response.json() as Promise<MatchListItem[]>;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export async function trackEventSeen(
  token: string,
  eventId: string | number,
): Promise<void> {
  const url = `${TULUM_API_URL}/favorites/seen`;
  await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ event_id: Number(eventId) }),
  });
}

export async function toggleFavorite(
  token: string,
  eventId: string | number,
): Promise<{ isFavorite: boolean }> {
  const url = `${TULUM_API_URL}/favorites/toggle`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ event_id: Number(eventId) }),
  });
  if (!response.ok) {
    throw new Error(`Failed to toggle favorite: ${response.status}`);
  }
  return response.json() as Promise<{ isFavorite: boolean }>;
}

export async function attendEvent(
  token: string,
  eventId: string | number,
): Promise<{ ticket: Record<string, unknown>; isNew: boolean }> {
  const url = `${TULUM_API_URL}/tickets/attend`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
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
  token: string,
  eventId: string | number,
): Promise<void> {
  const url = `${TULUM_API_URL}/tickets/attend?event_id=${Number(eventId)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`Failed to unattend event: ${response.status}`);
  }
}

// ─── Event Attendees ──────────────────────────────────────────────────────────

export interface EventAttendee {
  name: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  uri: string | null;
}

export interface EventAttendeesData {
  maxSpots: number;
  averageAge: number | null;
  females: number;
  males: number;
  guestList: EventAttendee[];
}

export async function fetchEventAttendees(
  eventId: string | number,
  token: string,
): Promise<EventAttendeesData> {
  const url = `${TULUM_API_URL}/tickets/attendees?event_id=${Number(eventId)}`;
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to fetch event attendees: ${response.status}`);
  }
  return response.json() as Promise<EventAttendeesData>;
}

export async function fetchMyTickets(token: string, userId: string) {
  const url = `${TULUM_API_URL}/tickets?guest_id=${encodeURIComponent(userId)}`;
  const response = await fetch(url, { headers: authHeaders(token) });
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
  token: string,
  eventId?: number,
): Promise<SwipeableResponse> {
  const qs = eventId ? `?event_id=${eventId}` : "";
  const url = `${TULUM_API_URL}/guests/swipeable${qs}`;
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Failed to fetch swipeable profiles: ${response.status}`);
  }
  return response.json() as Promise<SwipeableResponse>;
}

export async function createMatchSwipe(
  token: string,
  userId: string,
  otherUserId: string,
  eventId: number,
): Promise<void> {
  const url = `${TULUM_API_URL}/matches`;
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(token),
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
