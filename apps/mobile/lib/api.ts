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
    isFavorite: false,
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
  const response = await fetch(url);
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
