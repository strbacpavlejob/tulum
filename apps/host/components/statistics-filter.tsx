"use client";

import * as React from "react";
import { IconChevronDown, IconFilter } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "../i18n";

interface StatisticsFilterProps {
  venues: string[];
  selectedVenue: string;
  selectedStatus: string;
  onVenueChange: (venue: string) => void;
  onStatusChange: (status: string) => void;
}

export function StatisticsFilter({
  venues,
  onVenueChange,
  onStatusChange,
}: StatisticsFilterProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <h1 className="text-2xl font-semibold">
        {t("dashboard.navigation.dashboard")}
      </h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default">
            <IconFilter />
            <span className="hidden lg:inline">
              {t("dashboard.buttons.filter")}
            </span>
            <IconChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-semibold">
            {t("dashboard.filters.venue")}
          </div>
          <DropdownMenuItem onClick={() => onVenueChange("all")}>
            {t("dashboard.filters.allVenues")}
          </DropdownMenuItem>
          {venues.map((venue) => (
            <DropdownMenuItem key={venue} onClick={() => onVenueChange(venue)}>
              {venue}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-sm font-semibold">
            {t("dashboard.filters.status")}
          </div>
          <DropdownMenuItem onClick={() => onStatusChange("all")}>
            {t("dashboard.filters.allStatuses")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange("Live")}>
            {t("dashboard.filters.live")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange("Active")}>
            {t("dashboard.filters.active")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange("Completed")}>
            {t("dashboard.filters.completed")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStatusChange("Canceled")}>
            {t("dashboard.filters.canceled")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
