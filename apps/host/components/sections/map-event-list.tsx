"use client";

import { format, parseISO } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import { MapPinOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Location } from "@/store/locations";

/** How many of the soonest events the list shows. */
const MAX_EVENTS = 8;

function dateLocale(language: string) {
  switch (language) {
    case "ru":
      return ru;
    case "sr":
      return srLatn;
    default:
      return enUS;
  }
}

type DatedEvent = Location & { date: string; start: Date };

/**
 * Shown in the map's place when this browser can't run the map (no WebGL,
 * or MapLibre failed while mounting, QA TASK-003): the soonest of the active
 * events the map would have shown.
 */
export function MapEventList({ events }: { events: Location[] }) {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.language);

  const upcoming = events
    .map((event) => ({ ...event, start: parseISO(event.date ?? "") }))
    .filter(
      (event): event is DatedEvent => !Number.isNaN(event.start.getTime()),
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, MAX_EVENTS);

  return (
    <div className="flex w-full flex-col gap-4 p-6 text-left">
      <div className="flex items-start gap-3">
        <MapPinOff
          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold">{t("landingpage.map.fallbackTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {upcoming.length > 0
              ? t("landingpage.map.fallbackSubtitle")
              : t("landingpage.map.fallbackEmpty")}
          </p>
        </div>
      </div>
      {upcoming.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <span className="font-medium">{event.name}</span>
              <span className="text-sm text-muted-foreground">
                {[
                  event.venue_name,
                  format(event.start, "EEE d MMM · HH:mm", { locale }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
