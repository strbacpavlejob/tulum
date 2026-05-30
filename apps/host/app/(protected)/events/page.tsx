"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from "react";
import "../../../i18n";
import {
  IconPlus,
  IconLayoutList,
  IconLayoutGrid,
  IconSearch,
} from "@tabler/icons-react";

import { useEventsStore } from "@/store/events";
import { useVenuesStore } from "@/store/venues";
import { useStatisticsStore } from "@/store/statistics";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { ViewEventDialog } from "@/components/view-event-dialog";
import { EventsTable } from "@/components/events-table";
import { EventsGrid } from "@/components/events-grid";
import { deleteEvent as apiDeleteEvent } from "@/lib/api-client";
import type { Event } from "@/store/events";

export default function EventsPage() {
  const { t } = useTranslation();
  const {
    events,
    deleteEvent,
    fetchEvents,
    invalidate: invalidateEvents,
    isLoading,
  } = useEventsStore();
  const { fetchVenues, venues } = useVenuesStore();
  const { invalidate: invalidateStatistics } = useStatisticsStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [view, setView] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [venueFilter, setVenueFilter] = useState("all");
  const [editingEvent, setEditingEvent] = useState<(typeof events)[0] | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVenue = venueFilter === "all" || e.venue_id === venueFilter;
      return matchesSearch && matchesVenue;
    });
  }, [events, searchQuery, venueFilter]);

  const venuesSortedByEvents = useMemo(() => {
    const countMap = events.reduce<Record<string, number>>((acc, e) => {
      acc[e.venue_id] = (acc[e.venue_id] ?? 0) + 1;
      return acc;
    }, {});
    return [...venues].sort(
      (a, b) => (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0),
    );
  }, [venues, events]);

  // Fetch events and venues from store cache (only fetches from API on first load)
  useEffect(() => {
    fetchEvents();
    fetchVenues();
  }, [fetchEvents, fetchVenues]);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setEditingEvent(event);
      setIsCreateOpen(true);
    }
  };

  const refreshEvents = async () => {
    invalidateEvents();
    invalidateStatistics();
    await fetchEvents();
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingEvent(null);
    // Refresh events list when dialog closes
    refreshEvents();
  };

  const handleView = (id: string) => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setSelectedEvent(event);
      setIsViewOpen(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Show confirmation dialog
      await apiDeleteEvent(id);
      deleteEvent(id);
      invalidateStatistics();
    } catch (error) {
      console.error("Failed to delete event:", error);
      // TODO: Show error message to user
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
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {t("dashboard.navigation.events") || "Events"}
                </h1>
                <p className="text-muted-foreground">
                  {t("dashboard.eventsPage.description")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  value={view}
                  onValueChange={(v) => v && setView(v as "table" | "grid")}
                  variant="outline"
                >
                  <ToggleGroupItem value="table" aria-label="Table view">
                    <IconLayoutList className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <IconLayoutGrid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
                <Button onClick={handleCreate} className="gap-2">
                  <IconPlus className="h-4 w-4" />
                  {t("dashboard.eventsPage.createButton")}
                </Button>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("dashboard.eventsPage.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={venueFilter} onValueChange={setVenueFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue
                    placeholder={t("dashboard.eventsPage.allVenues")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("dashboard.eventsPage.allVenues")}
                  </SelectItem>
                  {venuesSortedByEvents.map((venue) => {
                    const count = events.filter(
                      (e) => e.venue_id === venue.id,
                    ).length;
                    return (
                      <SelectItem key={venue.id} value={venue.id}>
                        <span className="flex items-center justify-between gap-3 w-full">
                          <span>{venue.name}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {count}
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {view === "table" ? (
              <EventsTable
                events={filteredEvents}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            ) : (
              <EventsGrid
                events={filteredEvents}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
            )}

            {/* Create/Edit Event Dialog */}
            <CreateEventDialog
              isOpen={isCreateOpen}
              onClose={handleDialogClose}
              event={editingEvent}
            />

            {/* View Event Dialog */}
            <ViewEventDialog
              isOpen={isViewOpen}
              onClose={() => {
                setIsViewOpen(false);
                setSelectedEvent(null);
              }}
              event={selectedEvent}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
