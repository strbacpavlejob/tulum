"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { EventsMap, type EventWithLocation } from "@/components/events-map";
import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import {
  IconCalendar,
  IconMapPin,
  IconFilter,
  IconX,
} from "@tabler/icons-react";
import type { Event } from "@/store/events";
import type { Venue } from "@/store/venues";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";
import { getEvents, getVenues } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";

const VENUE_TYPE_OPTIONS = [
  { value: "bar", label: "Bar" },
  { value: "pub", label: "Pub" },
  { value: "nightclub", label: "Nightclub" },
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "cocktail_bar", label: "Cocktail Bar" },
  { value: "wine_bar", label: "Wine Bar" },
  { value: "brewery", label: "Brewery" },
  { value: "tavern", label: "Tavern" },
  { value: "raft", label: "Raft" },
] as const;

type VenueType = (typeof VENUE_TYPE_OPTIONS)[number]["value"];

export default function MapPage() {
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  // Filters
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
    return eventsWithLocation.filter((event) => {
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
  }, [eventsWithLocation, venueTypeFilter, dateFrom, dateTo, capacityRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

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

              {/* Filters */}
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <IconFilter className="h-4 w-4" />
                      Filters
                      {hasActiveFilters && (
                        <Badge
                          variant="default"
                          className="h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
                        >
                          !
                        </Badge>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground h-8"
                      onClick={resetFilters}
                    >
                      <IconX className="h-3 w-3" />
                      Reset
                    </Button>
                  )}
                </div>

                <CollapsibleContent>
                  <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Venue Type */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">Venue Type</span>
                      <Select
                        value={venueTypeFilter}
                        onValueChange={(v) =>
                          setVenueTypeFilter(v as VenueType | "all")
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          {VENUE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date From */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">From date</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 justify-start gap-2 font-normal"
                          >
                            <IconCalendar className="h-4 w-4 text-muted-foreground" />
                            {dateFrom ? (
                              format(dateFrom, "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">
                                Pick date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date To */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">To date</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 justify-start gap-2 font-normal"
                          >
                            <IconCalendar className="h-4 w-4 text-muted-foreground" />
                            {dateTo ? (
                              format(dateTo, "MMM d, yyyy")
                            ) : (
                              <span className="text-muted-foreground">
                                Pick date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            disabled={
                              dateFrom ? { before: dateFrom } : undefined
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Capacity Range */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">
                        Capacity: {capacityRange[0]}–{capacityRange[1]}
                      </span>
                      <div className="px-1 pt-2">
                        <Slider
                          min={0}
                          max={1000}
                          step={50}
                          value={capacityRange}
                          onValueChange={(v) =>
                            setCapacityRange(v as [number, number])
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {isLoading ? (
                <div className="flex items-center justify-center h-[calc(100vh-280px)]">
                  <p className="text-muted-foreground">Loading events...</p>
                </div>
              ) : (
                <div className="flex gap-4 h-[calc(100vh-320px)]">
                  {/* Left Column - Map */}
                  <div className="flex-1 rounded-lg border overflow-hidden">
                    <EventsMap events={filteredEvents} />
                  </div>

                  {/* Right Column - Event Cards */}
                  <div className="w-100 flex flex-col gap-4 overflow-y-auto pr-2">
                    {filteredEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <IconCalendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">
                          {hasActiveFilters
                            ? "No events match your filters"
                            : "No events yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {hasActiveFilters
                            ? "Try adjusting or resetting your filters"
                            : "Events will appear here when they are created"}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={resetFilters}
                          >
                            Reset filters
                          </Button>
                        )}
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          className={`rounded-lg border transition-all cursor-pointer ${
                            selectedEvent === event.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedEvent(event.id)}
                        >
                          <div className="p-4">
                            {/* Event Image */}
                            {(event.picture || event.venue.picture) && (
                              <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted mb-3">
                                <Image
                                  src={
                                    event.picture || event.venue.picture || ""
                                  }
                                  alt={event.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-base line-clamp-2">
                                  {event.title}
                                </h3>
                                <Badge
                                  variant={
                                    getStatusColor(event.status) as
                                      | "default"
                                      | "secondary"
                                      | "destructive"
                                  }
                                  className="shrink-0"
                                >
                                  {event.status}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p className="flex items-center gap-1">
                                  <IconMapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {event.venue.name}
                                  </span>
                                </p>
                                <p className="flex items-center gap-1">
                                  <IconCalendar className="h-3 w-3 shrink-0" />
                                  {format(
                                    new Date(event.start_date_time),
                                    "MMM d, yyyy 'at' HH:mm",
                                  )}
                                </p>
                              </div>

                              {event.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {event.tags.slice(0, 4).map((tag, index) => (
                                    <Badge
                                      key={`${event.id}-card-tag-${index}`}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {event.tags.length > 4 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      +{event.tags.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
