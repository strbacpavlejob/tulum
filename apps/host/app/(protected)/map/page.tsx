"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { EventsMap } from "@/components/events-map";
import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { IconCalendar, IconMapPin } from "@tabler/icons-react";
import type { Event } from "@/store/events";
import type { Venue } from "@/store/venues";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getEvents, getVenues } from "@/lib/api-client";
import { useAuth } from "@clerk/nextjs";

export default function MapPage() {
  const { t } = useTranslation();
  const { userId } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  // Fetch discovery data (other users' events) - cache in local state
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
  }, [setEvents, setVenues, userId]);

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
      .filter(Boolean);
  }, [events, venues]);

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
                    {eventsWithLocation.length} Events
                  </Badge>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-[calc(100vh-280px)]">
                  <p className="text-muted-foreground">Loading events...</p>
                </div>
              ) : (
                <>
                  {/* Two Column Layout */}
                  <div className="flex gap-4 h-[calc(100vh-280px)]">
                    {/* Left Column - Map */}
                    <div className="flex-1 rounded-lg border overflow-hidden">
                      <EventsMap />
                    </div>

                    {/* Right Column - Event Cards */}
                    <div className="w-100 flex flex-col gap-4 overflow-y-auto pr-2">
                      {eventsWithLocation.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <IconCalendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
                          <h3 className="font-semibold text-lg mb-2">
                            No events yet
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Events will appear here when they are created
                          </p>
                        </div>
                      ) : (
                        eventsWithLocation.map((event) => {
                          if (!event) return null;
                          return (
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
                                  <div className="w-full h-32 rounded-lg overflow-hidden bg-muted mb-3">
                                    <img
                                      src={event.picture || event.venue.picture}
                                      alt={event.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {/* Event Info */}
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-base line-clamp-2">
                                      {event.title}
                                    </h3>
                                    <Badge
                                      variant={getStatusColor(event.status)}
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

                                  {/* Tags */}
                                  {event.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {event.tags
                                        .slice(0, 4)
                                        .map((tag, index) => (
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
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
