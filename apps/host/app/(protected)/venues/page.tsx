"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import { StyledMapWithHandle } from "@/components/styled-map";
import { Button } from "@/components/ui/button";
import { IconPlus, IconMapPin } from "@tabler/icons-react";
import { useVenuesStore } from "@/store/venues";
import { useEventsStore } from "@/store/events";
import { useStatisticsStore } from "@/store/statistics";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import * as api from "@/lib/api-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateVenueDialog } from "@/components/create-venue-dialog";
import { Trash } from "lucide-react";

export default function MapsPage() {
  const { t } = useTranslation();
  const { userId } = useAuth();
  const { venues, deleteVenue, fetchVenues, invalidate, isLoading } =
    useVenuesStore();
  const { invalidate: invalidateEvents } = useEventsStore();
  const { invalidate: invalidateStatistics } = useStatisticsStore();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<(typeof venues)[0] | null>(
    null,
  );
  const [venueToDelete, setVenueToDelete] = useState<string | null>(null);

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
                      locations={venues}
                      selectedLocation={selectedLocation}
                      onLocationSelect={setSelectedLocation}
                    />
                  </div>

                  {/* Right Column - Venue Cards */}
                  <div className="w-[400px] flex flex-col gap-4 overflow-y-auto pr-2">
                    {venues.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                          <IconMapPin className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          {t("dashboard.venuesPage.emptyState.title") ||
                            "No venues yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t("dashboard.venuesPage.emptyState.description") ||
                            "Create your first venue to get started"}
                        </p>
                        <Button onClick={handleCreate} className="gap-2">
                          <IconPlus className="h-4 w-4" />
                          {t("dashboard.venuesPage.emptyState.createButton") ||
                            "Create Venue"}
                        </Button>
                      </div>
                    ) : (
                      venues.map((location) => (
                        <div
                          key={location.id}
                          className={`rounded-lg border transition-all ${
                            selectedLocation === location.id
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <div
                            className="cursor-pointer p-4"
                            onClick={() => handleCardClick(location)}
                          >
                            <div className="flex gap-4">
                              {/* Left Column - Circular Image */}
                              <div className="flex-shrink-0">
                                {location.picture ||
                                (location.picture_urls &&
                                  location.picture_urls.length > 0) ? (
                                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted transition-transform hover:scale-105">
                                    <img
                                      src={
                                        location.picture ||
                                        location.picture_urls![0]
                                      }
                                      alt={location.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center transition-all hover:bg-muted/80 hover:scale-105">
                                    <IconMapPin className="w-8 h-8 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>

                              {/* Right Column - Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-2 truncate">
                                  {location.name}
                                </h3>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <p className="capitalize">
                                    <span className="font-medium">
                                      {t("dashboard.venuesPage.card.type")}:
                                    </span>{" "}
                                    {location.type}
                                  </p>
                                  <p>
                                    <span className="font-medium">
                                      {t("dashboard.venuesPage.card.capacity")}:
                                    </span>{" "}
                                    {location.capacity}{" "}
                                    {t("dashboard.venuesPage.card.people")}
                                  </p>
                                  {location.address && (
                                    <p className="truncate">
                                      <span className="font-medium">
                                        {t("dashboard.venuesPage.card.address")}
                                        :
                                      </span>{" "}
                                      {location.address}
                                    </p>
                                  )}
                                  <p className="text-xs mt-2">
                                    {location.latitude.toFixed(4)},{" "}
                                    {location.longitude.toFixed(4)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 p-4 pt-0 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(location.id)}
                            >
                              {t("dashboard.venuesPage.card.editButton")}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteClick(location.id)}
                            >
                              {t("dashboard.venuesPage.card.deleteButton")}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Create/Edit Venue Dialog */}
              <CreateVenueDialog
                isOpen={isCreateOpen}
                onClose={handleDialogClose}
                venue={editingVenue}
              />

              {/* Delete Confirmation Dialog */}
              <AlertDialog
                open={venueToDelete !== null}
                onOpenChange={(open) => !open && setVenueToDelete(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("dashboard.venuesPage.deleteConfirmation.title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dashboard.venuesPage.deleteConfirmation.description")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("dashboard.venuesPage.deleteConfirmation.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDeleteConfirm}
                    >
                      {t("dashboard.venuesPage.deleteConfirmation.confirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
