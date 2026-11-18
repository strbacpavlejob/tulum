"use client";

import { useEffect, useState } from "react";
import type MapLibreGL from "maplibre-gl";
import { getNewDarkMapStyle } from "@/public/map-styles/dark";
import { getNewLightMapStyle } from "@/public/map-styles/light";

export type MapStyle = string | MapLibreGL.StyleSpecification | null;

/**
 * The dashboard's dark and light map styles, and which of the two the page
 * shows now: it follows the "dark" class on <html>.
 */
export function useMapStyles() {
  const [detectedTheme, setDetectedTheme] = useState<"light" | "dark">(
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );
  const [dark, setDark] = useState<MapStyle>(null);
  const [light, setLight] = useState<MapStyle>(null);

  // Load map styles
  useEffect(() => {
    (async () => {
      const darkStyle = await getNewDarkMapStyle();
      const lightStyle = await getNewLightMapStyle();
      setDark(darkStyle);
      setLight(lightStyle);
    })();
  }, []);

  // Detect theme changes
  useEffect(() => {
    const updateTheme = () => {
      setDetectedTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return { detectedTheme, dark, light };
}
