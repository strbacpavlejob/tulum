"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconEdit,
  IconTrash,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Event } from "@/store/events";
import { DateCard } from "@/components/common/date-card";
import EventStatusChip, { EventStatus } from "@/components/event-status-chip";

const PAGE_SIZE = 20;

interface EventsGridProps {
  events: Event[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function EventsGrid({
  events,
  onView,
  onEdit,
  onDelete,
  isLoading,
}: EventsGridProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedEvents = events.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-48 w-full rounded-none" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pagedEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden flex flex-col">
            {/* Event image */}
            <div className="relative h-48 w-full bg-muted">
              {event.picture ? (
                <Image
                  src={event.picture}
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No image
                </div>
              )}
              <div className="absolute top-2 right-2">
                <EventStatusChip status={event.status as EventStatus} />
              </div>
            </div>

            <CardContent className="flex gap-3 p-4 flex-1 items-center">
              {/* Info */}
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-semibold leading-tight line-clamp-2">
                  {event.title}
                </p>
                {event.venue_name && (
                  <p className="text-sm text-muted-foreground truncate">
                    {event.venue_name}
                  </p>
                )}
              </div>
              {/* Date card */}
              {event.start_date_time && (
                <div className="shrink-0">
                  <DateCard dateString={event.start_date_time} />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end gap-1 px-4 pb-3 pt-0 border-t">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(event.id)}
                aria-label={t("dashboard.eventsTable.actions.view")}
              >
                <IconEye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(event.id)}
                aria-label={t("dashboard.eventsTable.actions.edit")}
              >
                <IconEdit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(event.id)}
                aria-label={t("dashboard.eventsTable.actions.delete")}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground text-sm">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, events.length)} of {events.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - safePage) <= 1,
              )
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={item === safePage ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(item as number)}
                    aria-label={`Page ${item}`}
                    aria-current={item === safePage ? "page" : undefined}
                  >
                    {item}
                  </Button>
                ),
              )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
