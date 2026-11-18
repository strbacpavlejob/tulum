"use client";

import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { IconDotsVertical, IconGripVertical } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { z } from "zod";
import { schema } from "./schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import EventStatusChip from "../event-status-chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as React from "react";
import { EventStatsDialog } from "../event-stats-dialog";

export function DragHandle({ id }: { id: number }) {
  const { t } = useTranslation();
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">{t("dashboard.table.dragToReorder")}</span>
    </Button>
  );
}

export function getColumns(
  t: (key: string) => string,
): ColumnDef<z.infer<typeof schema>>[] {
  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "header",
      header: t("dashboard.table.eventName"),
      cell: ({ row }) => {
        return <TableCellViewer item={row.original} />;
      },
      enableHiding: false,
    },
    {
      accessorKey: "venue",
      header: t("dashboard.table.venue"),
      cell: ({ row }) => (
        <div className="w-32">
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            {row.original.venue}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("dashboard.table.status"),
      cell: ({ row }) => <EventStatusChip status={row.original.status} />,
    },
    {
      accessorKey: "views",
      header: () => (
        <div className="w-full text-right">{t("dashboard.table.views")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.views}
        </div>
      ),
    },
    {
      accessorKey: "bookmarks",
      header: () => (
        <div className="w-full text-right">
          {t("dashboard.table.bookmarks")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.bookmarks}
        </div>
      ),
    },
    {
      accessorKey: "tickets",
      header: () => (
        <div className="w-full text-right">
          {t("dashboard.table.attendees")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.tickets}
        </div>
      ),
    },
    {
      accessorKey: "conversionRate",
      header: () => (
        <div className="w-full text-right">
          {t("dashboard.table.conversionRate")}
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.conversionRate}
        </div>
      ),
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <IconDotsVertical />
              <span className="sr-only">{t("dashboard.table.openMenu")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem>{t("dashboard.table.edit")}</DropdownMenuItem>
            <DropdownMenuItem>
              {t("dashboard.table.makeACopy")}
            </DropdownMenuItem>
            <DropdownMenuItem>{t("dashboard.table.favorite")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              {t("dashboard.table.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

export function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const [statsOpen, setStatsOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="link"
        className="text-foreground w-fit px-0 text-left"
        onClick={() => setStatsOpen(true)}
      >
        {item.header}
      </Button>
      <EventStatsDialog
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        eventId={item.eventId}
        eventTitle={item.header}
        eventVenue={item.venue}
        eventStatus={item.status}
      />
    </>
  );
}
