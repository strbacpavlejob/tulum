"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  IconCalendar,
  IconFilter,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { VENUE_TYPE_OPTIONS, type VenueType } from "./venue-type-filter";

interface MapFiltersProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  hasSearch: boolean;
  filtersOpen: boolean;
  setFiltersOpen: Dispatch<SetStateAction<boolean>>;
  hasActiveFilters: boolean;
  resetFilters: () => void;
  venueTypeFilter: VenueType | "all";
  setVenueTypeFilter: Dispatch<SetStateAction<VenueType | "all">>;
  dateFrom: Date | undefined;
  setDateFrom: Dispatch<SetStateAction<Date | undefined>>;
  dateTo: Date | undefined;
  setDateTo: Dispatch<SetStateAction<Date | undefined>>;
  capacityRange: [number, number];
  setCapacityRange: Dispatch<SetStateAction<[number, number]>>;
}

export function MapFilters({
  searchQuery,
  setSearchQuery,
  hasSearch,
  filtersOpen,
  setFiltersOpen,
  hasActiveFilters,
  resetFilters,
  venueTypeFilter,
  setVenueTypeFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  capacityRange,
  setCapacityRange,
}: MapFiltersProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events or venues…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 focus:border-0 focus:border-transparent"
          />
          {hasSearch && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <IconFilter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge
                  variant="default"
                  className="h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
                >
                  !
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground h-8"
              onClick={resetFilters}
            >
              <IconX className="h-3 w-3" />
              Reset
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Venue Type */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Venue Type</span>
              <Select
                value={venueTypeFilter}
                onValueChange={(v) =>
                  setVenueTypeFilter(v as VenueType | "all")
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {VENUE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">From date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2 font-normal"
                  >
                    <IconCalendar className="h-4 w-4 text-muted-foreground" />
                    {dateFrom ? (
                      format(dateFrom, "MMM d, yyyy")
                    ) : (
                      <span className="text-muted-foreground">Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">To date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 justify-start gap-2 font-normal"
                  >
                    <IconCalendar className="h-4 w-4 text-muted-foreground" />
                    {dateTo ? (
                      format(dateTo, "MMM d, yyyy")
                    ) : (
                      <span className="text-muted-foreground">Pick date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    disabled={dateFrom ? { before: dateFrom } : undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Capacity Range */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Capacity: {capacityRange[0]}–{capacityRange[1]}
              </span>
              <div className="px-1 pt-2">
                <Slider
                  min={0}
                  max={1000}
                  step={50}
                  value={capacityRange}
                  onValueChange={(v) => setCapacityRange(v as [number, number])}
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
