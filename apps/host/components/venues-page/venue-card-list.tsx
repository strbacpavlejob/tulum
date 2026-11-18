"use client";

import { IconMapPin, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { Venue } from "@/store/venues";

interface VenueCardListProps {
  filteredVenues: Venue[];
  venues: Venue[];
  handleCreate: () => void;
  selectedLocation: string | null;
  handleCardClick: (location: Venue) => void;
  handleEdit: (id: string) => void;
  handleDeleteClick: (id: string) => void;
}

export function VenueCardList({
  filteredVenues,
  venues,
  handleCreate,
  selectedLocation,
  handleCardClick,
  handleEdit,
  handleDeleteClick,
}: VenueCardListProps) {
  const { t } = useTranslation();
  return (
    <div className="w-[400px] flex flex-col gap-4 overflow-y-auto pr-2">
      {filteredVenues.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <IconMapPin className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {venues.length === 0
              ? t("dashboard.venuesPage.emptyState.title") || "No venues yet"
              : t("dashboard.venuesPage.emptyState.noResults") ||
                "No venues match your search"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {venues.length === 0
              ? t("dashboard.venuesPage.emptyState.description") ||
                "Create your first venue to get started"
              : t("dashboard.venuesPage.emptyState.noResultsDescription") ||
                "Try a different search term"}
          </p>
          {venues.length === 0 && (
            <Button onClick={handleCreate} className="gap-2">
              <IconPlus className="h-4 w-4" />
              {t("dashboard.venuesPage.emptyState.createButton") ||
                "Create Venue"}
            </Button>
          )}
        </div>
      ) : (
        filteredVenues.map((location) => (
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
                        src={location.picture || location.picture_urls![0]}
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
                          {t("dashboard.venuesPage.card.address")}:
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
  );
}
