import { createRoot } from "react-dom/client";
import { LATITUDE_DELTA, LONGITUDE_DELTA } from "@/constants/map";

export function renderToDiv(
  element: React.ReactElement,
  size: number,
): HTMLDivElement {
  const container = document.createElement("div");
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  createRoot(container).render(element);
  return container;
}

export let leafletReady: Promise<void> | null = null;

export function loadLeaflet(): Promise<void> {
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve) => {
    const loadScript = (src: string): Promise<void> =>
      new Promise((res) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => res();
        document.head.appendChild(s);
      });

    const loadCss = (href: string) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };

    if ((window as any).L?.markerClusterGroup) {
      resolve();
      return;
    }

    // Leaflet core
    loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    loadCss(
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css",
    );
    loadCss(
      "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css",
    );

    const loadAll = async () => {
      if (!(window as any).L) {
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
      }
      await loadScript(
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js",
      );
      resolve();
    };
    loadAll();
  });
  return leafletReady;
}

export const maptilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? "";

export const TILE_URLS = {
  dark: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${maptilerKey}`,
  light: `https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key=${maptilerKey}`,
};

export const INITIAL_REGION = {
  longitude: 20.4573,
  latitude: 44.8156,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

export const ACTIVE_PIN_ZOOM = 16;

export const DEFAULT_MARKER_ICON_SIZE = 64;

export const SELECTED_MARKER_ICON_SIZE = 88;

export function getMarkerIconSize(isSelected: boolean) {
  return isSelected ? SELECTED_MARKER_ICON_SIZE : DEFAULT_MARKER_ICON_SIZE;
}
