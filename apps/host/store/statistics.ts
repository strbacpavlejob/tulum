import { create } from "zustand";

export interface EventStatistics {
  seenCount: number;
  savedCount: number;
  ticketCount: number;
  visitedCount: number;
}

export interface EventTableRow {
  id: number;
  eventId: string;
  header: string;
  venue: string;
  status: string;
  views: string;
  bookmarks: string;
  tickets: string;
  conversionRate: string;
}

export interface ChartDataPoint {
  date: string;
  views: number;
  bookmarks: number;
  attended: number;
}

interface StatisticsState {
  eventStatistics: EventStatistics | null;
  eventsTableData: EventTableRow[];
  chartData: ChartDataPoint[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  lastFetchedKey: string | null;
  fetchStatistics: (venueId?: string) => Promise<void>;
  invalidate: () => void;
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  eventStatistics: null,
  eventsTableData: [],
  chartData: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  lastFetchedKey: null,

  fetchStatistics: async (venueId?: string) => {
    const state = get();
    const cacheKey = venueId || "all";

    // Return cached data if same key and already fetched
    if (state.lastFetched !== null && state.lastFetchedKey === cacheKey) return;

    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (venueId && venueId !== "all") {
        params.append("venue_id", venueId);
      }

      const response = await fetch(`/api/statistics?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch statistics");

      const data = await response.json();

      set({
        eventStatistics: data.eventStatistics,
        eventsTableData: data.eventsTable || [],
        chartData: data.chartData || [],
        lastFetched: Date.now(),
        lastFetchedKey: cacheKey,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  invalidate: () => set({ lastFetched: null, lastFetchedKey: null }),
}));
