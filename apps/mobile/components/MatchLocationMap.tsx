import { useAppTheme } from "@/hooks/useAppTheme";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useColorScheme, View } from "react-native";
import useStore from "@/store/useStore";
import MapMarkerIcon from "./MapMarkerIcon";

interface MatchLocationMapProps {
  venueLat: number;
  venueLng: number;
  userLat: number;
  userLng: number;
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

function renderToDiv(
  element: React.ReactElement,
  size: number,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  createRoot(container).render(element);
  return container;
}

export const MatchLocationMap = ({
  venueLat,
  venueLng,
  userLat,
  userLng,
}: MatchLocationMapProps) => {
  const theme = useAppTheme();
  const colorScheme = useColorScheme();
  const storeTheme = useStore((s) => s.settings.theme);
  const isDark =
    storeTheme === "dark" ||
    (storeTheme === "system" && colorScheme === "dark");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Rebuild map when coordinates change
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
      }).setView([venueLat, venueLng], 14);

      // Venue marker
      const venueSize = 64;
      const venueEl = renderToDiv(
        <MapMarkerIcon size="md" isSelected={true} />,
        venueSize,
      );
      const venueIcon = L.divIcon({
        html: venueEl,
        className: "",
        iconSize: [venueSize, venueSize],
        iconAnchor: [venueSize / 2, venueSize / 2],
      });
      L.marker([venueLat, venueLng], { icon: venueIcon }).addTo(map);

      // User location marker — a pulsing blue dot
      const userDot = document.createElement("div");
      userDot.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
        position: relative;
      `;
      const userIcon = L.divIcon({
        html: userDot,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

      // Fit bounds to show both markers
      const bounds = L.latLngBounds([venueLat, venueLng], [userLat, userLng]);
      map.fitBounds(bounds, { padding: [60, 60] });

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
  }, [venueLat, venueLng, userLat, userLng]);

  // Swap tile layer on theme change
  useEffect(() => {
    if (!mapReady) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) tileLayerRef.current.remove();
    tileLayerRef.current = L.tileLayer(
      isDark ? TILE_URLS.dark : TILE_URLS.light,
      { maxZoom: 19 },
    ).addTo(map);
  }, [isDark, mapReady]);

  return (
    <View style={{ flex: 1 }}>
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    </View>
  );
};
