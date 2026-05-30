"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  IconEdit,
  IconTrash,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Event } from "@/store/events";
import { formatDate, formatTime } from "@/lib/locale";
import EventStatusChip, { EventStatus } from "./event-status-chip";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { IconBrandInstagram } from "@tabler/icons-react";

const PAGE_SIZE = 20;

interface EventsTableProps {
  events: Event[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export function EventsTable({
  events,
  onView,
  onEdit,
  onDelete,
  isLoading,
}: EventsTableProps) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const columns = [
    "eventName",
    "venue",
    "date",
    "time",
    "tickets",
    "status",
    "source",
  ];

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedEvents = events.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.eventsTable.title")}</CardTitle>
        <CardDescription>
          {t("dashboard.eventsTable.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>
                  {t(`dashboard.eventsTable.columns.${column}`)}
                </TableHead>
              ))}
              <TableHead className="text-right">
                {t("dashboard.eventsTable.columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : pagedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.venue_name}</TableCell>
                    <TableCell>
                      {formatDate(event.start_date_time, i18n.language)}
                    </TableCell>
                    <TableCell>
                      {formatTime(event.start_date_time, i18n.language)}
                    </TableCell>
                    <TableCell>{event.tickets_sold || 0}</TableCell>
                    <TableCell>
                      <EventStatusChip status={event.status as EventStatus} />
                    </TableCell>
                    <TableCell>
                      {event.scraper && (
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                        >
                          {event.scraper === "instagram" && (
                            <IconBrandInstagram className="size-3" />
                          )}
                          {event.scraper}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
      {!isLoading && totalPages > 1 && (
        <CardFooter className="flex items-center justify-between border-t pt-4">
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
        </CardFooter>
      )}
    </Card>
  );
}
