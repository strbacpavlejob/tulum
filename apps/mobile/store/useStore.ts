import { fetchActiveEvents } from "@/lib/api";
import {
  createDefaultDateRange,
  getDateRangeBounds,
  isInDateRange,
} from "@/lib/dateRange";
import { EventPin, EventSummary } from "@/types/event";
import { Filter } from "@/types/filter";
import { Settings } from "@/types/settings";
import { Ticket } from "@/types/ticket";
import { User } from "@/types/user";
import { create } from "zustand";

interface SwipeableCandidate {
  user_id: string;
  event_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  gender: "male" | "female" | "other" | null;
  picture_urls: string[];
  age: number;
  interests: string[];
  bio?: string | null;
  liked_by_me?: boolean;
}

interface SwipeableCandidatesCacheEntry {
  eventTitle: string;
  candidates: SwipeableCandidate[];
}

// 2) Define the shape of your entire store
interface MyStore {
  user: User | null;
  settings: Settings;
  inboxUnreadCount: number;
  events?: EventSummary[];
  filteredEvents?: EventSummary[];
  pins?: EventPin[];
  filteredPins?: EventPin[];
  tickets?: Ticket[];
  selectedEventId?: string | null;
  swipeableCandidatesByEvent: Record<string, SwipeableCandidatesCacheEntry>;
  filter: Filter;

  // Actions (methods) to mutate the state
  setUser: (user: User | null) => void;
  setSettings: (settings: Settings) => void;
  setInboxUnreadCount: (count: number) => void;
  setEvents: (events: EventSummary[]) => void;
  setPins: (pins: EventPin[]) => void;
  setTickets: (tickets: Ticket[]) => void;
  setSelectedEventId: (id: string | null) => void;
  setSwipeableCandidatesForEvent: (
    eventId: string,
    eventTitle: string,
    candidates: SwipeableCandidate[],
  ) => void;
  getSwipeableCandidatesForEvent: (
    eventId: string,
  ) => SwipeableCandidatesCacheEntry | null;
  clearSwipeableCandidatesForEvent: (eventId: string) => void;
  setFilter: (filter: Filter) => void;
  getFilter: () => Filter;
  applyEventsFilter: () => void;
  resetEventsFilter: () => void;
  refreshEvents: (token?: string) => Promise<void>;
  updateEventFavorite: (eventId: string, isFavorite: boolean) => void;
  updateEventAttendance: (eventId: string, isAttending: boolean) => void;
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
  inboxUnreadCount: 0,
  events: [],
  filteredEvents: [],
  pins: [],
  filteredPins: [],
  tickets: [],
  selectedEventId: null,
  swipeableCandidatesByEvent: {},
  filter: {
    title: "",
    tags: [],
    venueType: [],
    dateRange: createDefaultDateRange(),
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
  setInboxUnreadCount: (count: number) =>
    set({ inboxUnreadCount: Math.max(0, count) }),
  setEvents: (events: EventSummary[]) => set({ events }),
  setPins: (pins: EventPin[]) => set({ pins }),
  setTickets: (tickets: Ticket[]) => set({ tickets }),
  setSelectedEventId: (id: string | null) => set({ selectedEventId: id }),
  setSwipeableCandidatesForEvent: (
    eventId: string,
    eventTitle: string,
    candidates: SwipeableCandidate[],
  ) =>
    set((s) => ({
      swipeableCandidatesByEvent: {
        ...s.swipeableCandidatesByEvent,
        [eventId]: {
          eventTitle,
          candidates,
        },
      },
    })),
  getSwipeableCandidatesForEvent: (eventId: string) =>
    useStore.getState().swipeableCandidatesByEvent[eventId] ?? null,
  clearSwipeableCandidatesForEvent: (eventId: string) =>
    set((s) => {
      const next = { ...s.swipeableCandidatesByEvent };
      delete next[eventId];
      return { swipeableCandidatesByEvent: next };
    }),
  setFilter: (filter: Filter) => set({ filter }),
  getFilter: (): Filter => useStore.getState().filter,

  applyEventsFilter() {
    const { events = [], pins = [], filter } = useStore.getState();
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
      set({ filteredEvents: events, filteredPins: pins });
      return;
    }

    // Pre-normalize filter inputs
    const q = title?.trim().toLowerCase() ?? "";
    const tagSet = new Set((tags ?? []).map((t) => t.toLowerCase()));

    const dateBounds = getDateRangeBounds(dateRange);
    const now = new Date();

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

      // Date range (the same rule as the API; live events stay listed)
      if (!isInDateRange(event.date, dateBounds, now)) return false;

      // Guests limit (by guestCount)
      if (typeof guestsLimit === "number") {
        if (event.guestCount > guestsLimit) return false;
      }

      // Only favorites
      if (isOnlyFavorite && !event.isFavorite) return false;

      return true;
    });
    const filteredVenueIds = new Set(
      filtered
        .map((event) => event.venueId)
        .filter((venueId): venueId is string => Boolean(venueId)),
    );
    const filteredPins = pins.filter((pin) =>
      filteredVenueIds.has(pin.venueId),
    );

    set({ filteredEvents: filtered, filteredPins });
  },

  resetEventsFilter() {
    const { events, pins } = useStore.getState();
    set({
      filter: {
        title: "",
        tags: [],
        venueType: [],
        dateRange: createDefaultDateRange(),
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
    set({ filteredEvents: events, filteredPins: pins });
  },

  async refreshEvents(token?: string) {
    const { filter } = useStore.getState();
    const fresh = await fetchActiveEvents({ filter, token });
    set({ events: fresh.events, pins: fresh.pins });
    // The API applies the sheet's filters but not the search text or the tag
    // chip, so filter the new list here, with the filter as it is now.
    useStore.getState().applyEventsFilter();
  },

  updateEventFavorite(eventId: string, isFavorite: boolean) {
    const patch = (list: EventSummary[] = []) =>
      list.map((e) => (e.id === eventId ? { ...e, isFavorite } : e));
    set((s) => ({
      events: patch(s.events),
      filteredEvents: patch(s.filteredEvents),
    }));
  },

  /**
   * Moves the event's going count by one when you start or stop attending it.
   * Call it once per change: replacing your ticket, or adding one the server
   * already counts, leaves the count as it is. Map pins count events per
   * venue, not guests, so they don't change.
   */
  updateEventAttendance(eventId: string, isAttending: boolean) {
    const patch = (list: EventSummary[] = []) =>
      list.map((e) =>
        e.id === eventId
          ? {
              ...e,
              isAttending,
              guestCount:
                typeof e.guestCount === "number"
                  ? Math.max(0, e.guestCount + (isAttending ? 1 : -1))
                  : e.guestCount,
            }
          : e,
      );

    set((s) => ({
      events: patch(s.events),
      filteredEvents: patch(s.filteredEvents),
    }));
  },

  // Only the list of your tickets; the going count is updateEventAttendance's.
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
