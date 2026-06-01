import { create } from "zustand";
import { getVenues as apiGetVenues } from "@/lib/api-client";
import type { Venue as DBVenue } from "@/lib/types/database";

export interface Venue {
  id: string;
  host_id?: string;
  name: string;
  longitude: number;
  latitude: number;
  type: string;
  capacity: number;
  address?: string;
  description?: string;
  picture?: string;
  picture_urls?: string[];
  requires_reservation?: boolean;
  created_at?: string;
  updated_at?: string;
}

function transformVenue(v: DBVenue): Venue {
  return {
    id: v.id!,
    host_id: v.host_id,
    name: v.name,
    longitude: v.longitude,
    latitude: v.latitude,
    type: v.venue_type || "bar",
    capacity: v.capacity || 0,
    address: v.address,
    description: v.description,
    picture: v.picture_url,
    picture_urls: v.picture_urls || (v.picture_url ? [v.picture_url] : []),
    requires_reservation: v.requires_reservation,
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

interface VenuesState {
  venues: Venue[];
  selectedVenue: Venue | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  setVenues: (venues: Venue[]) => void;
  addVenue: (venue: Venue) => void;
  updateVenue: (id: string, venue: Partial<Venue>) => void;
  deleteVenue: (id: string) => void;
  selectVenue: (venue: Venue | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchVenues: (hostId?: string) => Promise<void>;
  invalidate: () => void;
}

export const useVenuesStore = create<VenuesState>((set, get) => ({
  venues: [],
  selectedVenue: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  setVenues: (venues) => set({ venues, lastFetched: Date.now() }),
  addVenue: (venue) =>
    set((state) => ({
      venues: [...state.venues, venue],
    })),
  updateVenue: (id, updatedVenue) =>
    set((state) => ({
      venues: state.venues.map((venue) =>
        venue.id === id ? { ...venue, ...updatedVenue } : venue,
      ),
    })),
  deleteVenue: (id) =>
    set((state) => ({
      venues: state.venues.filter((venue) => venue.id !== id),
      selectedVenue:
        state.selectedVenue?.id === id ? null : state.selectedVenue,
    })),
  selectVenue: (venue) => set({ selectedVenue: venue }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  fetchVenues: async (hostId?: string) => {
    const state = get();
    if (state.lastFetched !== null) return;

    set({ isLoading: true, error: null });
    try {
      const fetched = await apiGetVenues(hostId);
      const venues = fetched
        .filter((v) => v.id !== undefined)
        .map(transformVenue);
      set({ venues, lastFetched: Date.now() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  invalidate: () => set({ lastFetched: null }),
}));
