"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import type { Table } from "@tanstack/react-table";
import type { EventRow } from "./schema";

interface EventsTableToolbarProps {
  table: Table<EventRow>;
}

export function EventsTableToolbar({ table }: EventsTableToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <Label htmlFor="view-selector" className="sr-only">
        {t("dashboard.tabs.view")}
      </Label>
      <Select defaultValue="outline">
        <SelectTrigger
          className="flex w-fit @4xl/main:hidden"
          size="sm"
          id="view-selector"
        >
          <SelectValue placeholder={t("dashboard.tabs.selectView")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="outline">{t("dashboard.tabs.outline")}</SelectItem>
          <SelectItem value="past-performance">
            {t("dashboard.tabs.pastPerformance")}
          </SelectItem>
          <SelectItem value="key-personnel">
            {t("dashboard.tabs.keyPersonnel")}
          </SelectItem>
          <SelectItem value="focus-documents">
            {t("dashboard.tabs.focusDocuments")}
          </SelectItem>
        </SelectContent>
      </Select>
      <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
        <TabsTrigger value="outline">{t("dashboard.tabs.outline")}</TabsTrigger>
        <TabsTrigger value="past-performance">
          {t("dashboard.tabs.pastPerformance")}{" "}
          <Badge variant="secondary">3</Badge>
        </TabsTrigger>
        <TabsTrigger value="key-personnel">
          {t("dashboard.tabs.keyPersonnel")}{" "}
          <Badge variant="secondary">2</Badge>
        </TabsTrigger>
        <TabsTrigger value="focus-documents">
          {t("dashboard.tabs.focusDocuments")}
        </TabsTrigger>
      </TabsList>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <IconLayoutColumns />
              <span className="hidden lg:inline">
                {t("dashboard.buttons.customizeColumns")}
              </span>
              <span className="lg:hidden">
                {t("dashboard.buttons.columns")}
              </span>
              <IconChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide(),
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
