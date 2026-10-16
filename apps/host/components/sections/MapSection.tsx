"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
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

const LazyStyledMapWithHandle = dynamic(
  () =>
    import("../styled-map").then((module) => module.StyledMapWithHandle),
  { ssr: false, loading: MapSkeleton },
);

export default function MapSection() {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const mapLoadRequested = useRef(false);
  const { locations, isLoading, error, fetchLocations } = useLocationsStore();

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const loadMap = () => {
      if (mapLoadRequested.current) return;

      mapLoadRequested.current = true;
      setShouldLoadMap(true);
      void fetchLocations();
    };

    if (typeof IntersectionObserver === "undefined") {
      loadMap();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMap();
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [fetchLocations]);

  return (
    <section
      ref={sectionRef}
      id="map"
      aria-labelledby="guest-map-title"
      className="relative scroll-mt-28 w-full px-6 py-20"
    >
      <MascotSlot
        name="map"
        className="right-8 top-8 size-16 sm:right-12 sm:top-12 sm:size-20"
      />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2
            id="guest-map-title"
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
          >
            {t("landingpage.map.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landingpage.map.subtitle")}
          </p>
        </div>
        <Card className="p-0 overflow-hidden w-full flex items-center justify-center">
          <div
            className="w-full aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/7] lg:aspect-[16/5]"
            role="region"
            aria-labelledby="guest-map-title"
            aria-busy={!shouldLoadMap || isLoading}
          >
            {!shouldLoadMap || isLoading ? (
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
              <LazyStyledMapWithHandle
                locations={[]}
                disablePopOver
                selectedLocation={selectedLocation}
                onLocationSelect={setSelectedLocation}
              />
            ) : (
              <LazyStyledMapWithHandle
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
