import { fetchActiveEvents } from "@/lib/api";
import { Event } from "@/types/event";
import { Filter } from "@/types/filter";
import { Settings } from "@/types/settings";
import { Ticket } from "@/types/ticket";
import { User } from "@/types/user";
import { addDays } from "date-fns";
import { create } from "zustand";

// 2) Define the shape of your entire store
interface MyStore {
  user: User | null;
  settings: Settings;
  events?: Event[];
  filteredEvents?: Event[];
  tickets?: Ticket[];
  selectedEventId?: string | null;
  filter: Filter;

  // Actions (methods) to mutate the state
  setUser: (user: User | null) => void;
  setSettings: (settings: Settings) => void;
  setEvents: (events: Event[]) => void;
  setTickets: (tickets: Ticket[]) => void;
  setSelectedEventId: (id: string | null) => void;
  getSelectedEvent: () => Event | null;
  setFilter: (filter: Filter) => void;
  getFilter: () => Filter;
  applyEventsFilter: () => void;
  resetEventsFilter: () => void;
  refreshEvents: () => Promise<void>;
  updateEventSeen: (eventId: string) => void;
  updateEventFavorite: (eventId: string, isFavorite: boolean) => void;
}

// 3) Create the Zustand store
const useStore = create<MyStore>((set) => ({
  // Initial state
  user: null,
  settings: {
    language: "EN",
    theme: "dark",
    notificationsEnabled: true,
  },
  events: [],
  filteredEvents: [],
  tickets: [],
  selectedEventId: null,
  filter: {
    title: "",
    tags: [],
    dateRange: {
      start: null,
      end: null,
    },
    guestsLimit: null,
    isOnlyFavorite: false,
    priceRange: {
      min: null,
      max: null,
    },
    // location: {
    //   latitude: null,
    //   longitude: null,
    //   radius: null, // in kilometers
    // },
  },

  // Action implementations
  setUser: (user: User | null) => set({ user }),
  setSettings: (settings: Settings) => set({ settings }),
  setEvents: (events: Event[]) => set({ events }),
  setTickets: (tickets: Ticket[]) => set({ tickets }),
  setSelectedEventId: (id: string | null) => set({ selectedEventId: id }),
  getSelectedEvent: (): Event | null => {
    const { events, selectedEventId } = useStore.getState();
    return events?.find((event: Event) => event.id === selectedEventId) || null;
  },
  setFilter: (filter: Filter) => set({ filter }),
  getFilter: (): Filter => useStore.getState().filter,

  applyEventsFilter() {
    const { events = [], filter } = useStore.getState();
    const {
      title,
      tags = [],
      dateRange = { start: null, end: null },
      guestsLimit,
      isOnlyFavorite,
      priceRange = { min: null, max: null },
    } = filter;

    // Detect if any filter is actually active; if not, pass all events through.
    const isActive =
      Boolean(title?.trim()) ||
      (tags?.length ?? 0) > 0 ||
      !!dateRange.start ||
      !!dateRange.end ||
      typeof guestsLimit === "number" ||
      !!isOnlyFavorite ||
      priceRange.min != null ||
      priceRange.max != null;

    if (!isActive) {
      set({ filteredEvents: events });
      return;
    }

    // Pre-normalize filter inputs
    const q = title?.trim().toLowerCase() ?? "";
    const tagSet = new Set((tags ?? []).map((t) => t.toLowerCase()));

    const start = dateRange.start ? new Date(dateRange.start) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = dateRange.end ? new Date(dateRange.end) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const filtered = events.filter((event) => {
      // Title match (case-insensitive, substring)
      const titleOk = q ? (event.title ?? "").toLowerCase().includes(q) : true;
      if (!titleOk) return false;

      // Tags overlap (case-insensitive)
      if (tagSet.size) {
        const eventTags = (event.tags ?? []).map((t: string) =>
          t.toLowerCase(),
        );
        const hasOverlap = eventTags.some((t) => tagSet.has(t));
        if (!hasOverlap) return false;
      }

      // Date range (guard invalid/missing dates)
      const eventDate = event.date ? new Date(event.date) : null;
      if (start && (!eventDate || isNaN(+eventDate) || eventDate < start))
        return false;
      if (end && (!eventDate || isNaN(+eventDate) || eventDate > end))
        return false;

      // Guests limit
      if (typeof guestsLimit === "number") {
        const count = event.guests?.length ?? 0;
        if (count > guestsLimit) return false;
      }

      // Only favorites
      if (isOnlyFavorite && !event.isFavorite) return false;

      // Price range
      const price = event.price;
      if (
        priceRange.min != null &&
        !(typeof price === "number" && price >= priceRange.min)
      )
        return false;
      if (
        priceRange.max != null &&
        !(typeof price === "number" && price <= priceRange.max)
      )
        return false;

      return true;
    });
    set({ filteredEvents: filtered });
  },

  resetEventsFilter() {
    const { events } = useStore.getState();
    set({
      filter: {
        title: "",
        tags: [],
        dateRange: {
          start: new Date(),
          end: addDays(new Date(), 14),
        },
        guestsLimit: null,
        isOnlyFavorite: false,
        priceRange: {
          min: null,
          max: null,
        },
      },
    });
    set({ filteredEvents: events });
  },

  async refreshEvents() {
    const { filter, user } = useStore.getState();
    const fresh = await fetchActiveEvents({ filter, userId: user?.id });
    set({ events: fresh, filteredEvents: fresh });
  },

  updateEventSeen(eventId: string) {
    const patch = (list: Event[] = []) =>
      list.map((e) => (e.id === eventId ? { ...e, isSeen: true } : e));
    set((s) => ({
      events: patch(s.events),
      filteredEvents: patch(s.filteredEvents),
    }));
  },

  updateEventFavorite(eventId: string, isFavorite: boolean) {
    const patch = (list: Event[] = []) =>
      list.map((e) => (e.id === eventId ? { ...e, isFavorite } : e));
    set((s) => ({
      events: patch(s.events),
      filteredEvents: patch(s.filteredEvents),
    }));
  },
}));

export default useStore;
