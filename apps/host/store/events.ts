import { create } from "zustand";
import { getEvents as apiGetEvents, getVenues as apiGetVenues } from "@/lib/api-client";

export interface Event {
  id: number;
  venue_id: number;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  picture?: string; // Data URL or blob URL
  status: "draft" | "active" | "cancelled";
  tickets_sold?: number;
  venue_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  updateEvent: (id: number, event: Partial<Event>) => void;
  deleteEvent: (id: number) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchEvents: () => Promise<void>;
  invalidate: () => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  setEvents: (events) => set({ events, lastFetched: Date.now() }),
  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),
  updateEvent: (id, updatedEvent) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === id ? { ...event, ...updatedEvent } : event,
      ),
    })),
  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  fetchEvents: async () => {
    const state = get();
    if (state.lastFetched !== null) return;

    set({ isLoading: true, error: null });
    try {
      const [fetchedEvents, fetchedVenues] = await Promise.all([
        apiGetEvents(),
        apiGetVenues(),
      ]);

      const events: Event[] = fetchedEvents
        .filter((event) => event.id !== undefined)
        .map((event) => {
          const venue = fetchedVenues.find((v) => v.id === event.venue_id);
          return {
            id: event.id!,
            venue_id: event.venue_id,
            title: event.title,
            description: event.description,
            start_date_time: event.start_date_time,
            end_date_time: event.end_date_time,
            tags: event.tags,
            picture: event.picture_url,
            status: event.status,
            venue_name: venue?.name || "",
            created_at: event.created_at,
            updated_at: event.updated_at,
          };
        });

      set({ events, lastFetched: Date.now() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  invalidate: () => set({ lastFetched: null }),
}));
