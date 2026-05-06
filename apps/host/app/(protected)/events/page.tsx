"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import "../../../i18n";
import { IconPlus } from "@tabler/icons-react";

import { useEventsStore } from "@/store/events";
import { useVenuesStore } from "@/store/venues";
import { useStatisticsStore } from "@/store/statistics";
import { CreateEventDialog } from "@/components/create-event-dialog";
import { ViewEventDialog } from "@/components/view-event-dialog";
import { EventsTable } from "@/components/events-table";
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
  const { fetchVenues } = useVenuesStore();
  const { invalidate: invalidateStatistics } = useStatisticsStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<(typeof events)[0] | null>(
    null,
  );
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events and venues from store cache (only fetches from API on first load)
  useEffect(() => {
    fetchEvents();
    fetchVenues();
  }, [fetchEvents, fetchVenues]);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (id: number) => {
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

  const handleView = (id: number) => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setSelectedEvent(event);
      setIsViewOpen(true);
    }
  };

  const handleDelete = async (id: number) => {
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
              <Button onClick={handleCreate} className="gap-2">
                <IconPlus className="h-4 w-4" />
                {t("dashboard.eventsPage.createButton")}
              </Button>
            </div>

            <EventsTable
              events={events}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
            />

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
