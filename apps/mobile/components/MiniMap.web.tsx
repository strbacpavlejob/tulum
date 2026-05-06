import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useColorScheme, View } from "react-native";
import MapMarkerIcon from "./MapMarkerIcon";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  height?: number;
  markerTitle?: string;
}

const TILE_URLS = {
  dark: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
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
  const isDark = colorScheme === "dark";
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

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

      tileLayerRef.current = L.tileLayer(
        isDark ? TILE_URLS.dark : TILE_URLS.light,
        { maxZoom: 19 },
      ).addTo(map);

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

      L.marker([latitude, longitude], { icon }).addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || !tileLayerRef.current) return;

    tileLayerRef.current.remove();
    tileLayerRef.current = L.tileLayer(
      isDark ? TILE_URLS.dark : TILE_URLS.light,
      { maxZoom: 19 },
    ).addTo(map);
  }, [isDark]);

  return (
    <View className="w-full" style={{ height }}>
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 16,
          overflow: "hidden",
        }}
      />
    </View>
  );
};
