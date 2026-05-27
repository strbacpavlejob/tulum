"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import type MapLibreGL from "maplibre-gl";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  MapMarkerClusterGroup,
} from "@/components/ui/map";
import Marker from "@/components/common/marker";
import { getNewDarkMapStyle } from "@/public/map-styles/dark";
import { getNewLightMapStyle } from "@/public/map-styles/light";
import Cluster from "./common/cluster";

interface Location {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  type: string;
  capacity: number;
  address?: string;
  description?: string;
  picture?: string;
  picture_urls?: string[];
}

interface StyledMapProps {
  locations: Location[];
  selectedLocation: string | null;
  onLocationSelect: (locationId: string | null) => void;
  onLocationFocus?: (location: Location) => void;
  disablePopOver?: boolean;
  markerSize?: "sm" | "md" | "xl";
}

export function StyledMap({
  locations,
  selectedLocation,
  onLocationSelect,
  onLocationFocus,
  disablePopOver = false,
  markerSize = "xl",
}: StyledMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const [detectedTheme, setDetectedTheme] = useState<"light" | "dark">(
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );
  const [dark, setDark] = useState<
    string | MapLibreGL.StyleSpecification | null
  >(null);
  const [light, setLight] = useState<
    string | MapLibreGL.StyleSpecification | null
  >(null);

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

  // Load map styles
  useEffect(() => {
    (async () => {
      const darkStyle = await getNewDarkMapStyle();
      const lightStyle = await getNewLightMapStyle();
      setDark(darkStyle);
      setLight(lightStyle);
    })();
  }, []);

  // Expose map instance for external control (flyTo, etc.)
  useEffect(() => {
    if (mapRef.current && onLocationFocus && selectedLocation) {
      const location = locations.find((v) => v.id === selectedLocation);
      if (location) {
        onLocationFocus(location);
      }
    }
  }, [selectedLocation, locations, onLocationFocus]);

  useEffect(() => {
    const removeAttribution = () => {
      const attrib = document.querySelector(".maplibregl-ctrl-attrib");

      if (attrib) {
        // remove the whole bottom-right container
        const container = attrib.closest(".maplibregl-ctrl-bottom-right");
        container?.remove();
      }
    };

    // Run once
    removeAttribution();

    // Optional: run again after map renders (MapLibre mounts async)
    const timeout = setTimeout(removeAttribution, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Map
      ref={mapRef}
      center={[20.4489, 44.8125]}
      zoom={12}
      minZoom={10}
      maxZoom={18}
      className="w-full h-full"
      theme={detectedTheme}
      styles={{
        dark: dark ?? undefined,
        light: light ?? undefined,
      }}
    >
      <MapControls />

      <MapMarkerClusterGroup
        radius={60}
        maxZoom={16}
        icon={(count) => <Cluster count={count} />}
      >
        {locations.map((location) => (
          <MapMarker
            key={location.id}
            longitude={location.longitude}
            latitude={location.latitude}
            onClick={() => onLocationSelect(location.id)}
          >
            <MarkerContent>
              <Marker
                image={location.picture || location.picture_urls?.[0]}
                size={markerSize}
              />
            </MarkerContent>

            {selectedLocation === location.id && !disablePopOver && (
              <MarkerPopup offset={[0, -20]}>
                <div className="p-3 min-w-50">
                  <h3 className="font-semibold text-base mb-2">
                    {location.name}
                  </h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="capitalize">
                      <span className="font-medium">
                        {t("dashboard.venuesPage.card.type")}:
                      </span>{" "}
                      {location.type}
                    </p>
                    <p>
                      <span className="font-medium">
                        {t("dashboard.venuesPage.card.capacity")}:
                      </span>{" "}
                      {location.capacity}{" "}
                      {t("dashboard.venuesPage.card.people")}
                    </p>
                  </div>
                  <button
                    onClick={() => onLocationSelect(null)}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    {t("venuesPage.popup.close")}
                  </button>
                </div>
              </MarkerPopup>
            )}
          </MapMarker>
        ))}
      </MapMarkerClusterGroup>
    </Map>
  );
}

// Export a ref handle for external map control
export interface StyledMapHandle {
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
}

export function StyledMapWithHandle({
  locations,
  selectedLocation,
  onLocationSelect,
  disablePopOver = false,
}: Omit<StyledMapProps, "onLocationFocus">) {
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  const flyTo = (longitude: number, latitude: number, zoom = 15) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom,
        duration: 1000,
      });
    }
  };

  // Fly to selected location when it changes (e.g., clicking venue card)
  useEffect(() => {
    if (selectedLocation !== null) {
      const venue = locations.find((v) => v.id === selectedLocation);
      if (venue) {
        flyTo(venue.longitude, venue.latitude);
      }
    }
  }, [selectedLocation, locations]);

  return (
    <StyledMap
      locations={locations}
      selectedLocation={selectedLocation}
      onLocationSelect={onLocationSelect}
      onLocationFocus={(location) =>
        flyTo(location.longitude, location.latitude)
      }
      disablePopOver={disablePopOver}
    />
  );
}
