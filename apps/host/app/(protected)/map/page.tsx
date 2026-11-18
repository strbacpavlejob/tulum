"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type EventWithLocation } from "@/components/events-map/types";
import { StyledMapWithHandle } from "@/components/styled-map";
import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { IconCalendar } from "@tabler/icons-react";
import type { Event } from "@/store/events";
import type { Venue } from "@/store/venues";
import { Badge } from "@/components/ui/badge";
import { getEvents, getVenues } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";
import { MapEventList } from "@/components/events-map/map-event-list";
import { MapFilters } from "@/components/events-map/map-filters";
import { VenueType } from "@/components/events-map/venue-type-filter";

export default function MapPage() {
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [venueTypeFilter, setVenueTypeFilter] = useState<VenueType | "all">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [capacityRange, setCapacityRange] = useState<[number, number]>([
    0, 1000,
  ]);

  const hasActiveFilters =
    venueTypeFilter !== "all" ||
    dateFrom !== undefined ||
    dateTo !== undefined ||
    capacityRange[0] !== 0 ||
    capacityRange[1] !== 1000;

  const resetFilters = () => {
    setVenueTypeFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setCapacityRange([0, 1000]);
  };

  const hasSearch = searchQuery.trim().length > 0;

  // Fetch discovery data (other users' events)
  useEffect(() => {
    if (hasFetched.current) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        hasFetched.current = true;
        const [fetchedEvents, fetchedVenues] = await Promise.all([
          getEvents(),
          getVenues(),
        ]);

        const venuesWithType: Venue[] = fetchedVenues
          .filter((v) => v.id !== undefined)
          .map((v) => ({
            id: v.id!,
            host_id: v.host_id,
            name: v.name,
            longitude: v.longitude,
            latitude: v.latitude,
            type: v.venue_type || "bar",
            capacity: v.capacity || 100,
            address: v.address,
            description: v.description,
            picture_urls: v.picture_urls,
            created_at: v.created_at,
            updated_at: v.updated_at,
          }));

        const eventsWithVenueName: Event[] = fetchedEvents
          .filter((event) => {
            if (event.id === undefined) return false;
            const venue = venuesWithType.find((v) => v.id === event.venue_id);
            return venue && venue.host_id !== userId;
          })
          .map((event) => {
            const venue = venuesWithType.find((v) => v.id === event.venue_id);
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
              tickets_sold: 0,
              venue_name: venue?.name || "",
              created_at: event.created_at,
              updated_at: event.updated_at,
            };
          });

        setEvents(eventsWithVenueName);
        setVenues(venuesWithType);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Join events with their venue location data
  const eventsWithLocation = useMemo(() => {
    return events
      .map((event) => {
        const venue = venues.find((v) => v.id === event.venue_id);
        if (!venue) return null;
        return {
          ...event,
          venue,
          longitude: venue.longitude,
          latitude: venue.latitude,
        };
      })
      .filter(Boolean) as EventWithLocation[];
  }, [events, venues]);

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return eventsWithLocation.filter((event) => {
      if (
        q &&
        !event.title.toLowerCase().includes(q) &&
        !event.venue.name.toLowerCase().includes(q)
      )
        return false;
      if (venueTypeFilter !== "all" && event.venue.type !== venueTypeFilter)
        return false;
      if (dateFrom && new Date(event.start_date_time) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(event.start_date_time) > end) return false;
      }
      const cap = event.venue.capacity ?? 0;
      if (cap < capacityRange[0] || cap > capacityRange[1]) return false;
      return true;
    });
  }, [
    eventsWithLocation,
    searchQuery,
    venueTypeFilter,
    dateFrom,
    dateTo,
    capacityRange,
  ]);

  const filteredLocations = useMemo(
    () =>
      filteredEvents.map((event) => ({
        id: event.id,
        name: event.title,
        longitude: event.longitude,
        latitude: event.latitude,
        type: event.venue.type,
        capacity: event.venue.capacity ?? 0,
        address: event.venue.address,
        description: event.venue.description,
        picture: event.picture ?? undefined,
        picture_urls: event.venue.picture_urls,
      })),
    [filteredEvents],
  );

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {t("dashboard.navigation.maps")}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Discover events happening around you
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <IconCalendar className="h-3 w-3" />
                    {filteredEvents.length} Events
                  </Badge>
                </div>
              </div>

              {/* Search & Filters */}
              <MapFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                hasSearch={hasSearch}
                filtersOpen={filtersOpen}
                setFiltersOpen={setFiltersOpen}
                hasActiveFilters={hasActiveFilters}
                resetFilters={resetFilters}
                venueTypeFilter={venueTypeFilter}
                setVenueTypeFilter={setVenueTypeFilter}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                capacityRange={capacityRange}
                setCapacityRange={setCapacityRange}
              />

              {isLoading ? (
                <div className="flex items-center justify-center h-[calc(100vh-280px)]">
                  <p className="text-muted-foreground">Loading events...</p>
                </div>
              ) : (
                <div className="flex gap-4 h-[calc(100vh-320px)]">
                  {/* Left Column - Map */}
                  <div className="flex-1 rounded-lg border overflow-hidden">
                    <StyledMapWithHandle
                      locations={filteredLocations}
                      selectedLocation={selectedEvent}
                      onLocationSelect={setSelectedEvent}
                    />
                  </div>

                  {/* Right Column - Event Cards */}
                  <MapEventList
                    filteredEvents={filteredEvents}
                    hasActiveFilters={hasActiveFilters}
                    resetFilters={resetFilters}
                    selectedEvent={selectedEvent}
                    setSelectedEvent={setSelectedEvent}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
