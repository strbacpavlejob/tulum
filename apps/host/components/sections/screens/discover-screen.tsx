"use client";

import Image from "next/image";
import { Heart, Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MapPreview } from "./map-preview";

type DemoEventKey = "neonTerrace" | "clubParagon" | "sunsetSessions";
type DemoEventCopy = {
  name: string;
  locationLine: string;
  date: string;
  dateLong: string;
};

export function DiscoverScreen() {
  const { t } = useTranslation();
  const filterTags = t("landingpage.screens.discover.filterTags", {
    returnObjects: true,
  }) as string[];
  const eventCopy = t("landingpage.screens.events", {
    returnObjects: true,
  }) as Record<DemoEventKey, DemoEventCopy>;
  const tagLabels = t("landingpage.screens.tags", {
    returnObjects: true,
  }) as Record<string, string>;
  const events = [
    {
      id: "1",
      ...eventCopy.neonTerrace,
      tags: ["rooftop", "house"],
      picture:
        "https://images.unsplash.com/photo-1570872626485-d8ffea69f463?auto=format&fit=crop&w=640&q=65",
      going: 87,
    },
    {
      id: "2",
      ...eventCopy.clubParagon,
      tags: ["cocktails", "deepHouse"],
      picture:
        "https://images.unsplash.com/photo-1485872299829-c673f5194813?auto=format&fit=crop&w=640&q=65",
      going: 140,
    },
    {
      id: "3",
      ...eventCopy.sunsetSessions,
      tags: ["cocktails", "deepHouse"],
      picture:
        "https://images.unsplash.com/photo-1605958611031-c91316261ab0?auto=format&fit=crop&w=640&q=65",
      going: 62,
    },
  ];

  return (
    <div className="relative h-full w-full overflow-hidden bg-background font-sans text-foreground">
      <MapPreview
        className="absolute inset-0"
        markerImages={events.map((event) => event.picture)}
      />
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex h-12 flex-1 items-center gap-2 rounded-full bg-background/85 px-4 backdrop-blur-md border border-foreground/10 shadow-sm dark:shadow-none">
            <Search className="h-5 w-5 text-foreground/40" />
            <span className="text-sm text-foreground/50">
              {t("landingpage.screens.discover.searchPlaceholder")}
            </span>
          </div>

          {/* Filter */}
          <button
            type="button"
            aria-label={t("landingpage.screens.discover.filtersLabel")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-background/85 backdrop-blur-md border border-foreground/10 shadow-sm dark:shadow-none"
          >
            <SlidersHorizontal className="h-5 w-5 text-foreground/70" />
          </button>
        </div>

        {/* Tags */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filterTags.map((tag, i) => (
            <button
              key={tag}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-md border transition
            ${
              i === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/80 text-foreground/70 border-foreground/10 hover:bg-background"
            }
            shadow-sm dark:shadow-none`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="bg-gradient-to-t from-background via-background/85 to-transparent px-4 pb-4 pt-12">
          {/* Cards */}
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {events.map((event) => (
              <button
                key={event.id}
                className={`relative flex h-24 min-w-[300px] shrink-0 overflow-hidden rounded-2xl bg-background/90 text-left shadow-xl backdrop-blur-sm transition ${
                  event.id === events[0].id
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-foreground/10"
                }`}
              >
                {/* Image */}
                <div className="h-full w-1/3 overflow-hidden">
                  <Image
                    src={event.picture}
                    alt=""
                    width={640}
                    height={480}
                    sizes="160px"
                    quality={65}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-between p-3">
                  {/* Top info */}
                  <div className="pr-8">
                    <p className="text-sm font-semibold">{event.name}</p>

                    <p className="text-xs text-foreground/50">
                      {event.locationLine}
                    </p>

                    <p className="mt-1 text-[11px] text-foreground/50">
                      {event.date} · {event.going}{" "}
                      {t("landingpage.screens.discover.going")}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-foreground/6 px-2 py-1 text-[10px] text-foreground/60"
                      >
                        {tagLabels[tag]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Heart */}
                <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
                  <Heart className="h-4 w-4 text-foreground/60" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
