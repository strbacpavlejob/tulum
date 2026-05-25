import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Linking, useColorScheme, View } from "react-native";
import useStore from "@/store/useStore";
import MapMarkerIcon from "./MapMarkerIcon";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  height?: number;
  markerTitle?: string;
}

const maptilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

const TILE_URLS = {
  dark: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${maptilerKey}`,
  light: `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${maptilerKey}`,
};

let leafletReady: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve) => {
    if ((window as any).L) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return leafletReady;
}

export const MiniMap = ({
  latitude,
  longitude,
  height = 150,
}: MiniMapProps) => {
  const colorScheme = useColorScheme();
  const storeTheme = useStore((s) => s.settings.theme);
  const isDark =
    storeTheme === "dark" ||
    (storeTheme === "system" && colorScheme === "dark");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let map: any;
    loadLeaflet().then(() => {
      const L = (window as any).L;
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
      }).setView([latitude, longitude], 14);

      // Add marker
      const markerSize = 64;
      const container = document.createElement("div");
      container.style.width = `${markerSize}px`;
      container.style.height = `${markerSize}px`;
      createRoot(container).render(
        <MapMarkerIcon size="md" isSelected={true} />,
      );

      const icon = L.divIcon({
        html: container,
        className: "",
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      L.marker([latitude, longitude], { icon })
        .addTo(map)
        .on("click", () => Linking.openURL(mapsUrl));

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  useEffect(() => {
    if (!mapReady) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    tileLayerRef.current = L.tileLayer(
      isDark ? TILE_URLS.dark : TILE_URLS.light,
      { maxZoom: 19 },
    ).addTo(map);
  }, [isDark, mapReady]);

  return (
    <View className="w-full" style={{ height }}>
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 16,
          overflow: "hidden",
          cursor: "pointer",
        }}
      />
    </View>
  );
};
