"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { StyledMapWithHandle } from "@/components/styled-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useVenuesStore } from "@/store/venues";
import { useEventsStore } from "@/store/events";
import { useStatisticsStore } from "@/store/statistics";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import * as api from "@/lib/api-client";
import { CreateVenueDialog } from "@/components/create-venue-dialog";
import { Trash } from "lucide-react";
import { DeleteVenueDialog } from "@/components/venues-page/delete-venue-dialog";
import { VenueCardList } from "@/components/venues-page/venue-card-list";

export default function MapsPage() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { venues, deleteVenue, fetchVenues, invalidate, isLoading } =
    useVenuesStore();
  const { invalidate: invalidateEvents } = useEventsStore();
  const { invalidate: invalidateStatistics } = useStatisticsStore();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingVenue, setEditingVenue] = useState<(typeof venues)[0] | null>(
    null,
  );
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null);

  const filteredVenues = useMemo(() => {
    if (!searchQuery) return venues;
    const q = searchQuery.toLowerCase();
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q) ||
        (v.address ?? "").toLowerCase().includes(q),
    );
  }, [venues, searchQuery]);

  // Load venues from store cache (only fetches from API on first load)
  useEffect(() => {
    if (!userId) return;
    fetchVenues(userId);
  }, [userId, fetchVenues]);

  const handleCreate = () => {
    setEditingVenue(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (id: string) => {
    const venue = venues.find((v) => v.id === id);
    if (venue) {
      setEditingVenue(venue);
      setIsCreateOpen(true);
    }
  };

  const refreshVenues = async () => {
    if (!userId) return;
    invalidate();
    invalidateEvents();
    invalidateStatistics();
    await fetchVenues(userId);
  };

  const handleDialogClose = () => {
    setIsCreateOpen(false);
    setEditingVenue(null);
    // Refresh venues list when dialog closes
    refreshVenues();
  };

  const handleDeleteClick = (id: string) => {
    setVenueToDelete(id);
  };

  const handleDeleteConfirm = async () => {
    if (venueToDelete !== null) {
      const venue = venues.find((v) => v.id === venueToDelete);

      try {
        // Delete from API
        await api.deleteVenue(venueToDelete);

        // Delete from local store
        deleteVenue(venueToDelete);
        invalidateEvents();
        invalidateStatistics();

        if (selectedLocation === venueToDelete) {
          setSelectedLocation(null);
        }
        setVenueToDelete(null);

        toast(t("dashboard.venuesPage.toast.deleted"), {
          description: venue
            ? `${venue.name} ${t("dashboard.venuesPage.toast.deletedDescription")}`
            : undefined,
          icon: <Trash className="w-4 h-4" />,
          position: "top-center",
        });
      } catch (error) {
        console.error("Error deleting venue:", error);
        toast.error(
          t("dashboard.venuesPage.toast.deleteError") ||
            "Failed to delete venue",
        );
        setVenueToDelete(null);
      }
    }
  };

  const handleCardClick = (location: (typeof venues)[0]) => {
    setSelectedLocation(location.id);
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
                  <h1 className="text-2xl font-semibold">{t("venue.title")}</h1>
                  <p className="text-muted-foreground text-sm">
                    {t("venue.subtitle")}
                  </p>
                </div>
                <Button onClick={handleCreate} className="gap-2">
                  <IconPlus className="h-4 w-4" />
                  {t("dashboard.venuesPage.createButton")}
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("dashboard.venuesPage.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 max-w-sm"
                />
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center h-[calc(100vh-280px)]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      {t("dashboard.venuesPage.loading") || "Loading venues..."}
                    </p>
                  </div>
                </div>
              ) : (
                /* Two Column Layout */
                <div className="flex gap-4 h-[calc(100vh-280px)]">
                  {/* Left Column - Map */}
                  <div className="flex-1 rounded-lg border overflow-hidden">
                    <StyledMapWithHandle
                      locations={filteredVenues}
                      selectedLocation={selectedLocation}
                      onLocationSelect={setSelectedLocation}
                    />
                  </div>

                  {/* Right Column - Venue Cards */}
                  <VenueCardList
                    filteredVenues={filteredVenues}
                    venues={venues}
                    handleCreate={handleCreate}
                    selectedLocation={selectedLocation}
                    handleCardClick={handleCardClick}
                    handleEdit={handleEdit}
                    handleDeleteClick={handleDeleteClick}
                  />
                </div>
              )}

              {/* Create/Edit Venue Dialog */}
              <CreateVenueDialog
                isOpen={isCreateOpen}
                onClose={handleDialogClose}
                venue={editingVenue}
              />

              {/* Delete Confirmation Dialog */}
              <DeleteVenueDialog
                venueToDelete={venueToDelete}
                setVenueToDelete={setVenueToDelete}
                handleDeleteConfirm={handleDeleteConfirm}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
