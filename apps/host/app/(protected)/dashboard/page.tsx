"use client";

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { StatisticsFilter } from "@/components/statistics-filter";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { StatisticCardProps } from "@/components/common/statistic-card";
import { useTranslation } from "react-i18next";
import { useStatisticsStore } from "@/store/statistics";
import { EventStatus } from "@/components/event-status-chip";

export default function Page() {
  const { t } = useTranslation();
  const [venueFilter, setVenueFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const { eventStatistics, eventsTableData, fetchStatistics, invalidate } =
    useStatisticsStore();

  // Fetch statistics from store cache (refetches when venue filter changes)
  React.useEffect(() => {
    fetchStatistics(venueFilter !== "all" ? venueFilter : undefined);
  }, [venueFilter, fetchStatistics]);

  // Handle venue filter change: invalidate cache when switching venues
  const handleVenueChange = React.useCallback(
    (venue: string) => {
      if (venue !== venueFilter) {
        invalidate();
      }
      setVenueFilter(venue);
    },
    [venueFilter, invalidate],
  );

  // Derive statistics cards from store data
  const statistics = React.useMemo<StatisticCardProps[] | undefined>(() => {
    if (!eventStatistics) return undefined;

    const conversionRate =
      eventStatistics.seenCount > 0
        ? (
            (eventStatistics.ticketCount / eventStatistics.seenCount) *
            100
          ).toFixed(1)
        : "0.0";

    return [
      {
        title: "eventViews",
        value: eventStatistics.seenCount.toLocaleString(),
        description: t("dashboard.cards.eventViews"),
        footer: {
          label: t("dashboard.cards.strongVisibility"),
          description: t("dashboard.cards.eventsAppearedToUsers"),
        },
      },
      {
        title: "bookmarksSaved",
        value: eventStatistics.savedCount.toLocaleString(),
        description: t("dashboard.cards.bookmarksSaved"),
        footer: {
          label: t("dashboard.cards.highInterest"),
          description: t("dashboard.cards.viewersSavedEvents"),
        },
      },
      {
        title: "interestedPlanningToAttend",
        value: eventStatistics.visitedCount.toLocaleString(),
        description: t("dashboard.cards.interestedPlanningToAttend"),
        footer: {
          label: t("dashboard.cards.strongEngagement"),
          description: t("dashboard.cards.bookmarksConvertedToInterest"),
        },
      },
      {
        title: "ticketConversionRate",
        value: `${conversionRate}%`,
        description: t("dashboard.cards.ticketConversionRate"),
        footer: {
          label: t("dashboard.cards.aboveAverage"),
          description: t("dashboard.cards.ticketsSoldFromViews"),
        },
      },
    ];
  }, [eventStatistics, t]);

  const venues = React.useMemo(() => {
    return Array.from(
      new Set(eventsTableData.map((item) => item.venue)),
    ).sort();
  }, [eventsTableData]);

  const filteredData = React.useMemo(() => {
    let filtered = eventsTableData;
    if (venueFilter !== "all") {
      filtered = filtered.filter((item) => item.venue === venueFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    return filtered.map((item) => ({
      ...item,
      status: item.status as EventStatus,
    }));
  }, [eventsTableData, venueFilter, statusFilter]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <StatisticsFilter
                venues={venues}
                selectedVenue={venueFilter}
                selectedStatus={statusFilter}
                onVenueChange={handleVenueChange}
                onStatusChange={setStatusFilter}
              />
              <SectionCards statistics={statistics} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive
                  venueId={venueFilter !== "all" ? venueFilter : null}
                />
              </div>
              <DataTable data={filteredData} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
