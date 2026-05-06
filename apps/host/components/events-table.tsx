"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Event } from "@/store/events";
import { formatDate, formatTime } from "@/lib/locale";
import EventStatusChip, { EventStatus } from "./event-status-chip";
import { Skeleton } from "./ui/skeleton";

interface EventsTableProps {
  events: Event[];
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
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
  const columns = ["eventName", "venue", "date", "time", "tickets", "status"];

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
              : events.map((event) => (
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
    </Card>
  );
}
