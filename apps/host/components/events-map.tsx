"use client";

import { useState, useMemo } from "react";
import {
  Map,
  MapPopup,
  MapControls,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";
import { useEventsStore } from "@/store/events";
import { useVenuesStore } from "@/store/venues";
import Marker from "@/components/common/marker";
import type { Event } from "@/store/events";
import type { Venue } from "@/store/venues";

export type EventWithLocation = Event & {
  longitude: number;
  latitude: number;
  venue_name?: string;
  venue_picture?: string;
  venue: Venue;
};

interface EventsMapProps {
  /** When provided, these events (already joined with venue location) are rendered instead of the store. */
  events?: EventWithLocation[];
}

export function EventsMap({ events: eventsOverride }: EventsMapProps = {}) {
  const storeEvents = useEventsStore((state) => state.events);
  const storeVenues = useVenuesStore((state) => state.venues);

  const eventsFromStore = useMemo(() => {
    if (eventsOverride) return null;
    return storeEvents
      .map((event) => {
        const venue = storeVenues.find((v) => v.id === event.venue_id);
        if (!venue) return null;
        return {
          ...event,
          longitude: venue.longitude,
          latitude: venue.latitude,
          venue_name: venue.name,
          venue_picture: venue.picture,
          venue,
        };
      })
      .filter((e): e is EventWithLocation => e !== null);
  }, [eventsOverride, storeEvents, storeVenues]);

  const eventsWithLocation = eventsOverride ?? eventsFromStore ?? [];

  const [selectedEvent, setSelectedEvent] = useState<EventWithLocation | null>(
    null,
  );

  return (
    <div className="h-[400px] w-full">
      <Map center={[20.45, 44.8]} zoom={10} fadeDuration={0}>
        {eventsWithLocation.map((event) => (
          <MapMarker
            key={event.id}
            longitude={event.longitude}
            latitude={event.latitude}
            onClick={() => setSelectedEvent(event)}
          >
            <MarkerContent>
              <Marker size="md" image={event.picture || event.venue_picture} />
            </MarkerContent>
          </MapMarker>
        ))}

        {selectedEvent && (
          <MapPopup
            key={`${selectedEvent.longitude}-${selectedEvent.latitude}`}
            longitude={selectedEvent.longitude}
            latitude={selectedEvent.latitude}
            onClose={() => setSelectedEvent(null)}
            closeOnClick={false}
            focusAfterOpen={false}
            closeButton
          >
            <div className="space-y-1 p-1">
              <p className="font-semibold text-sm">{selectedEvent.title}</p>
              <p className="text-xs text-muted-foreground">
                {selectedEvent.venue_name}
              </p>
              <p className="text-xs">
                {new Date(selectedEvent.start_date_time).toLocaleDateString()}
              </p>
            </div>
          </MapPopup>
        )}

        <MapControls />
      </Map>
    </div>
  );
}
