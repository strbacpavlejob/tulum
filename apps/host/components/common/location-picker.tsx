"use client";

import { useState, useEffect, useRef } from "react";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IconSearch, IconLoader2 } from "@tabler/icons-react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MapControls,
} from "@/components/ui/map";
import Marker from "@/components/common/marker";
import type MapLibreGL from "maplibre-gl";

interface LocationPickerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  errors?: {
    address?: { message?: string };
    latitude?: { message?: string };
    longitude?: { message?: string };
  };
  mapPosition: [number, number];
  onMapPositionChange: (position: [number, number]) => void;
  theme: "light" | "dark";
  darkStyle: string | MapLibreGL.StyleSpecification | null;
  lightStyle: string | MapLibreGL.StyleSpecification | null;
  t: (key: string) => string;
}

export function LocationPicker({
  register,
  setValue,
  errors,
  mapPosition,
  onMapPositionChange,
  theme,
  darkStyle,
  lightStyle,
  t,
}: LocationPickerProps) {
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  // Attach click handler to map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: MapLibreGL.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      onMapPositionChange([lng, lat]);
      setValue("longitude", lng.toString());
      setValue("latitude", lat.toString());
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
    };
  }, [setValue, onMapPositionChange]);

  const handleAddressSearch = async () => {
    const address = (document.getElementById("address") as HTMLInputElement)
      ?.value;
    if (!address || address.trim().length < 3) {
      return;
    }

    setIsSearching(true);
    try {
      // Use our geocoding API route
      const response = await fetch(
        `/api/geocode?address=${encodeURIComponent(address)}`,
      );

      if (response.ok) {
        const result = await response.json();
        if (result.latitude && result.longitude) {
          const { latitude, longitude } = result;

          // Update map position
          onMapPositionChange([longitude, latitude]);

          // Update form values
          setValue("latitude", latitude.toString());
          setValue("longitude", longitude.toString());

          // Pan map to new location with animation
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 15,
              duration: 1500,
            });
          }
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      {/* Address */}
      <div className="grid gap-2">
        <Label htmlFor="address">
          {t("venueDialog.fields.address") || "Address"} *
        </Label>
        <div className="flex gap-2">
          <Input
            id="address"
            placeholder={
              t("venueDialog.placeholders.address") || "Enter full address"
            }
            {...register("address")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddressSearch();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddressSearch}
            disabled={isSearching}
            title={t("venueDialog.fields.searchLocation") || "Search location"}
          >
            {isSearching ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconSearch className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors?.address && (
          <p className="text-sm text-red-500">{errors.address.message}</p>
        )}
      </div>

      {/* Map Location Picker */}
      <div className="grid gap-2">
        <div className="h-80 w-full rounded-lg border overflow-hidden">
          {darkStyle && lightStyle && (
            <Map
              ref={mapRef}
              center={mapPosition}
              zoom={14}
              minZoom={10}
              maxZoom={18}
              className="w-full h-full cursor-crosshair"
              theme={theme}
              styles={{
                dark: darkStyle ?? undefined,
                light: lightStyle ?? undefined,
              }}
            >
              <MapControls />
              <MapMarker longitude={mapPosition[0]} latitude={mapPosition[1]}>
                <MarkerContent>
                  <Marker size="md" />
                </MarkerContent>
              </MapMarker>
            </Map>
          )}
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            {t("venueDialog.fields.latitude") || "Latitude"}:{" "}
            {mapPosition[1].toFixed(6)}
          </span>
          <span>
            {t("venueDialog.fields.longitude") || "Longitude"}:{" "}
            {mapPosition[0].toFixed(6)}
          </span>
        </div>
        {(errors?.latitude || errors?.longitude) && (
          <p className="text-sm text-red-500">
            {errors.latitude?.message || errors.longitude?.message}
          </p>
        )}
        {/* Hidden fields for form validation */}
        <input type="hidden" {...register("latitude")} />
        <input type="hidden" {...register("longitude")} />
      </div>
    </>
  );
}
