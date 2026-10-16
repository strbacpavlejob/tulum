"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { StyledMapWithHandle } from "../styled-map";
import { useState, useEffect } from "react";
import { useLocationsStore } from "@/store/locations";
import { Skeleton } from "@/components/ui/skeleton";
import { MascotSlot } from "./mascot-slot";

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
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const { locations, isLoading, error, fetchLocations } = useLocationsStore();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return (
    <section
      id="map"
      className="relative scroll-mt-28 w-full px-6 py-20"
    >
      <MascotSlot
        name="map"
        className="right-8 top-8 size-16 sm:right-12 sm:top-12 sm:size-20"
      />
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
              <div
                role="alert"
                className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center text-muted-foreground"
              >
                <p>{t("landingpage.map.error")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchLocations()}
                >
                  {t("landingpage.map.retry")}
                </Button>
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
