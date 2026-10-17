"use client";

import dynamic from "next/dynamic";
import { Lock, Unlock } from "lucide-react";
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
  () => import("../styled-map").then((module) => module.StyledMapWithHandle),
  { ssr: false, loading: MapSkeleton },
);

export default function MapSection() {
  const { t } = useTranslation();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [mapUnlocked, setMapUnlocked] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapLoadRequested = useRef(false);
  const { locations, isLoading, error, fetchLocations } = useLocationsStore();

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (!mapContainer) return;

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
      { rootMargin: "100px 0px" },
    );

    observer.observe(mapContainer);
    return () => observer.disconnect();
  }, [fetchLocations]);

  return (
    <section
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
            ref={mapContainerRef}
            className="relative w-full aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/7] lg:aspect-[16/5]"
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
            {!error && !mapUnlocked && (
              <div
                aria-label={t("landingpage.map.unlockControls")}
                onClick={() => setMapUnlocked(true)}
                className="absolute inset-0 z-20 flex touch-pan-y flex-col items-center justify-center gap-2 bg-background/45 px-6 text-center text-foreground backdrop-blur-[2px] transition-colors hover:bg-background/55 md:hidden"
              >
                <span className="flex max-w-xs flex-col items-center gap-2 rounded-2xl border border-border/70 bg-background/90 px-5 py-4 shadow-lg">
                  <Unlock className="size-4" aria-hidden="true" />
                  <span className="font-semibold">
                    {t("landingpage.map.unlockControls")}
                  </span>
                </span>
              </div>
            )}
            {!error && mapUnlocked && (
              <button
                type="button"
                aria-label={t("landingpage.map.lockControls")}
                onClick={() => setMapUnlocked(false)}
                className="absolute bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 touch-pan-y items-center gap-2 rounded-full border border-border/70 bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg md:hidden"
              >
                <Lock className="size-4" aria-hidden="true" />
                {t("landingpage.map.lockControls")}
              </button>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
