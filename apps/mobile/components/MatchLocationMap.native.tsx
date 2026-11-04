import LeafletWebView, {
  LeafletEvent,
  LeafletPin,
  LeafletWebViewHandle,
} from "@/components/map/LeafletWebView";
import {
  FIT_BOUNDS_PADDING,
  INITIAL_REGION,
  isValidCoord,
  mapPalette,
  TILE_URLS,
  useIsDarkMap,
  VENUE_ZOOM,
} from "@/components/map/mapConfig";
import { useAppTheme } from "@/hooks/useAppTheme";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

interface MatchLocationMapProps {
  venueLat: number;
  venueLng: number;
  userLat?: number;
  userLng?: number;
}

/**
 * The location gates' map on Android and iOS (TASK-019): the venue and the
 * user in a still Leaflet map in a WebView, zoomed to show both.
 */
export const MatchLocationMap = ({
  venueLat,
  venueLng,
  userLat,
  userLng,
}: MatchLocationMapProps) => {
  const theme = useAppTheme();
  const isDark = useIsDarkMap();
  const mapRef = useRef<LeafletWebViewHandle>(null);
  const [mapGeneration, setMapGeneration] = useState(0);
  const hasVenue = isValidCoord(venueLat, venueLng);

  const handleMapEvent = useCallback((event: LeafletEvent) => {
    if (event.type === "ready") setMapGeneration((n) => n + 1);
  }, []);

  useEffect(() => {
    if (mapGeneration === 0) return;
    mapRef.current?.send({
      type: "setTheme",
      tileUrl: isDark ? TILE_URLS.dark : TILE_URLS.light,
      palette: mapPalette(theme),
    });
  }, [mapGeneration, isDark, theme]);

  useEffect(() => {
    if (mapGeneration === 0) return;
    const pins: LeafletPin[] = [];
    if (isValidCoord(venueLat, venueLng)) {
      pins.push({ key: "venue", lat: venueLat, lng: venueLng, selected: true });
    }
    if (isValidCoord(userLat, userLng)) {
      pins.push({
        key: "user",
        kind: "user",
        lat: userLat as number,
        lng: userLng as number,
        selected: true,
      });
    }
    mapRef.current?.send({ type: "setPins", pins });
    if (pins.length === 2) {
      mapRef.current?.send({
        type: "fitBounds",
        points: pins.map((pin): [number, number] => [pin.lat, pin.lng]),
        padding: FIT_BOUNDS_PADDING,
      });
    } else if (pins.length === 1) {
      mapRef.current?.send({
        type: "setView",
        lat: pins[0].lat,
        lng: pins[0].lng,
        zoom: VENUE_ZOOM,
      });
    }
  }, [mapGeneration, venueLat, venueLng, userLat, userLng]);

  return (
    <View style={{ flex: 1 }} pointerEvents="none">
      <LeafletWebView
        ref={mapRef}
        center={
          hasVenue
            ? { lat: venueLat, lng: venueLng }
            : { lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude }
        }
        zoom={VENUE_ZOOM}
        interactive={false}
        backgroundColor={theme.background}
        onEvent={handleMapEvent}
      />
    </View>
  );
};
