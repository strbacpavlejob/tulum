import { create } from "zustand";

export interface Location {
  id: number;
  name: string;
  longitude: number;
  latitude: number;
  type: string;
  capacity: number;
  address?: string;
  description?: string;
  picture?: string;
  picture_urls?: string[];
}

interface LocationsState {
  locations: Location[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchLocations: () => Promise<void>;
  invalidate: () => void;
}

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export const useLocationsStore = create<LocationsState>((set, get) => ({
  locations: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  fetchLocations: async () => {
    const state = get();

    // If fetched today, use cached data
    if (state.lastFetched !== null && isSameDay(state.lastFetched, Date.now())) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/events/active");
      if (!response.ok) {
        throw new Error("Failed to fetch active events");
      }
      const locations: Location[] = await response.json();
      set({ locations, lastFetched: Date.now() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
  invalidate: () => set({ lastFetched: null }),
}));
