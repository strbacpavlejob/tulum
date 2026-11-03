import LeafletWebView, {
  LeafletEvent,
  LeafletWebViewHandle,
} from "@/components/map/LeafletWebView";
import {
  directionsUrl,
  INITIAL_REGION,
  isValidCoord,
  mapPalette,
  TILE_URLS,
  useIsDarkMap,
  VENUE_ZOOM,
} from "@/components/map/mapConfig";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ArrowUpRight } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, StyleSheet, View } from "react-native";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  height?: number;
  markerTitle?: string;
}

/**
 * Event details' venue map on Android and iOS: a still Leaflet map in a
 * WebView (TASK-019). As on web, tapping it opens directions.
 */
export const MiniMap = ({
  latitude,
  longitude,
  height = 150,
}: MiniMapProps) => {
  const theme = useAppTheme();
  const isDark = useIsDarkMap();
  const { t } = useTranslation();
  const mapRef = useRef<LeafletWebViewHandle>(null);
  const [mapGeneration, setMapGeneration] = useState(0);
  const hasCoords = isValidCoord(latitude, longitude);

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
    if (mapGeneration === 0 || !hasCoords) return;
    mapRef.current?.send({
      type: "setView",
      lat: latitude,
      lng: longitude,
      zoom: VENUE_ZOOM,
    });
    mapRef.current?.send({
      type: "setPins",
      pins: [{ key: "venue", lat: latitude, lng: longitude, selected: true }],
    });
  }, [mapGeneration, hasCoords, latitude, longitude]);

  const openDirections = useCallback(() => {
    if (!hasCoords) return;
    Linking.openURL(directionsUrl(latitude, longitude)).catch((error) =>
      console.warn("Could not open directions:", error),
    );
  }, [hasCoords, latitude, longitude]);

  return (
    <View className="w-full" style={{ height, position: "relative" }}>
      <View style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
        <LeafletWebView
          ref={mapRef}
          center={
            hasCoords
              ? { lat: latitude, lng: longitude }
              : { lat: INITIAL_REGION.latitude, lng: INITIAL_REGION.longitude }
          }
          zoom={VENUE_ZOOM}
          interactive={false}
          backgroundColor={theme.background}
          onEvent={handleMapEvent}
        />
      </View>
      <Pressable
        onPress={openDirections}
        accessibilityRole="link"
        accessibilityLabel={t("openInMaps")}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "rgba(0, 0, 0, 0.72)",
          zIndex: 1000,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: "#fff",
          }}
        >
          {t("openInMaps")}
        </Text>
        <ArrowUpRight size={12} color="#fff" />
      </View>
    </View>
  );
};
