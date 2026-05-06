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

export function EventsMap() {
  const events = useEventsStore((state) => state.events);
  const venues = useVenuesStore((state) => state.venues);

  const eventsWithLocation = useMemo(() => {
    return events
      .map((event) => {
        const venue = venues.find((v) => v.id === event.venue_id);
        if (!venue) return null;
        return {
          ...event,
          longitude: venue.longitude,
          latitude: venue.latitude,
          venue_name: venue.name,
          venue_picture: venue.picture,
        };
      })
      .filter((event) => event !== null);
  }, [events, venues]);

  const [selectedEvent, setSelectedEvent] = useState<
    (typeof eventsWithLocation)[number] | null
  >(null);

  return (
    <div className="h-[400px] w-full">
      <Map center={[20.45, 44.8]} zoom={10} fadeDuration={0}>
        {/* Individual markers for each event */}
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
