"use client";

import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { StyledMapWithHandle } from "../styled-map";
import { useState, useEffect } from "react";
import { useLocationsStore } from "@/store/locations";
import { Skeleton } from "@/components/ui/skeleton";

function MapSkeleton() {
  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl bg-muted">
      <Skeleton className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32 rounded" />
      </div>
    </div>
  );
}

export default function MapSection() {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const { locations, isLoading, error, fetchLocations } = useLocationsStore();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return (
    <section id="map" className="py-20 px-6 w-full">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            {t("landingpage.map.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landingpage.map.subtitle")}
          </p>
        </div>
        <Card className="p-0 overflow-hidden w-full flex items-center justify-center">
          <div className="w-full aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/7] lg:aspect-[16/5]">
            {isLoading ? (
              <MapSkeleton />
            ) : error ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <p>{t("landingpage.map.error", "Failed to load map data")}</p>
              </div>
            ) : locations.length === 0 ? (
              <StyledMapWithHandle
                locations={[]}
                disablePopOver
                selectedLocation={selectedLocation}
                onLocationSelect={setSelectedLocation}
              />
            ) : (
              <StyledMapWithHandle
                disablePopOver
                locations={locations}
                selectedLocation={selectedLocation}
                onLocationSelect={setSelectedLocation}
              />
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
