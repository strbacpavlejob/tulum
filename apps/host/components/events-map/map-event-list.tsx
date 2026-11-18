"use client";

import type { Dispatch, SetStateAction } from "react";
import { IconCalendar, IconMapPin } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { EventWithLocation } from "./types";

/** The badge variant for an event status. */
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

interface MapEventListProps {
  filteredEvents: EventWithLocation[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
  selectedEvent: string | null;
  setSelectedEvent: Dispatch<SetStateAction<string | null>>;
}

export function MapEventList({
  filteredEvents,
  hasActiveFilters,
  resetFilters,
  selectedEvent,
  setSelectedEvent,
}: MapEventListProps) {
  return (
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
                    src={event.picture || event.venue.picture || ""}
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
                    <span className="truncate">{event.venue.name}</span>
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
                      <Badge variant="secondary" className="text-xs">
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
  );
}
