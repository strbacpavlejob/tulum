import { Event } from "@/types/event";
import { Filter } from "@/types/filter";

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
