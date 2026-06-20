import { fetchActiveEvents } from "@/lib/api";
import { EventSummary } from "@/types/event";
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
  events?: EventSummary[];
  filteredEvents?: EventSummary[];
  tickets?: Ticket[];
  selectedEventId?: string | null;
  filter: Filter;

  // Actions (methods) to mutate the state
  setUser: (user: User | null) => void;
  setSettings: (settings: Settings) => void;
  setEvents: (events: EventSummary[]) => void;
  setTickets: (tickets: Ticket[]) => void;
  setSelectedEventId: (id: string | null) => void;
  setFilter: (filter: Filter) => void;
  getFilter: () => Filter;
  applyEventsFilter: () => void;
  resetEventsFilter: () => void;
  refreshEvents: () => Promise<void>;
  updateEventFavorite: (eventId: string, isFavorite: boolean) => void;
  addTicket: (ticket: Ticket) => void;
  removeTicketByEventId: (eventId: string) => void;
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
    venueType: null,
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
    capacityRange: {
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
  setEvents: (events: EventSummary[]) => set({ events }),
  setTickets: (tickets: Ticket[]) => set({ tickets }),
  setSelectedEventId: (id: string | null) => set({ selectedEventId: id }),
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
    } = filter;

    // Detect if any filter is actually active; if not, pass all events through.
    const isActive =
      Boolean(title?.trim()) ||
      (tags?.length ?? 0) > 0 ||
      !!dateRange.start ||
      !!dateRange.end ||
      typeof guestsLimit === "number" ||
      !!isOnlyFavorite;

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
      // Search match (case-insensitive, substring) across event title + venue fields
      const titleText = (event.title ?? "").toLowerCase();
      const venueText = (event.venueName ?? "").toLowerCase();
      const addressText = (
        event.address ??
        event.location?.address ??
        ""
      ).toLowerCase();
      const tagsText = (event.tags ?? []).map((tag) => tag.toLowerCase());
      const searchOk = q
        ? titleText.includes(q) ||
          venueText.includes(q) ||
          addressText.includes(q) ||
          tagsText.some((tag) => tag.includes(q))
        : true;
      if (!searchOk) return false;

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

      // Guests limit (by guestCount)
      if (typeof guestsLimit === "number") {
        if (event.guestCount > guestsLimit) return false;
      }

      // Only favorites
      if (isOnlyFavorite && !event.isFavorite) return false;

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
        venueType: null,
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
        capacityRange: {
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

  updateEventFavorite(eventId: string, isFavorite: boolean) {
    const patch = (list: EventSummary[] = []) =>
      list.map((e) => (e.id === eventId ? { ...e, isFavorite } : e));
    set((s) => ({
      events: patch(s.events),
      filteredEvents: patch(s.filteredEvents),
    }));
  },

  addTicket(ticket: Ticket) {
    set((s) => ({
      tickets: [
        ticket,
        ...(s.tickets ?? []).filter((t) => t.event_id !== ticket.event_id),
      ],
    }));
  },

  removeTicketByEventId(eventId: string) {
    set((s) => ({
      tickets: (s.tickets ?? []).filter((t) => t.event_id !== eventId),
    }));
  },
}));

export default useStore;
