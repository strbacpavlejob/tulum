"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AdminOnlyError,
  getGuestReports,
  updateGuestReportStatus,
  type GuestReport,
  type GuestReportStatus,
} from "@/lib/api-client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "../../../i18n";
import { GuestReportCard } from "@/components/reports-page/guest-report-card";
import { STATUSES } from "@/components/reports-page/report-statuses";

type StatusFilter = GuestReportStatus | "all";

// Reasons that may need someone to act quickly.
/**
 * Guest reports for Tulum admins (TASK-001). Guests report each other from
 * a profile or a chat in the app; reporting also blocked the guest for the
 * reporter. The API answers 403 to anyone who isn't an admin.
 */
export default function GuestReportsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  // Bumped to load the list again, e.g. after a status change.
  const [reloadKey, setReloadKey] = useState(0);
  const [reports, setReports] = useState<GuestReport[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "adminOnly" | "error"
  >("loading");

  useEffect(() => {
    let active = true;
    getGuestReports(filter === "all" ? undefined : filter).then(
      (rows) => {
        if (!active) return;
        setReports(rows);
        setState("ready");
      },
      (error: unknown) => {
        if (!active) return;
        setState(error instanceof AdminOnlyError ? "adminOnly" : "error");
      },
    );
    return () => {
      active = false;
    };
  }, [filter, reloadKey]);

  const selectFilter = (next: StatusFilter) => {
    setState("loading");
    setFilter(next);
  };

  const changeStatus = async (report: GuestReport, status: string) => {
    try {
      await updateGuestReportStatus(report.id, status as GuestReportStatus);
      toast.success(t("dashboard.guestReportsPage.statusSaved"));
      setReloadKey((key) => key + 1);
    } catch {
      toast.error(t("dashboard.guestReportsPage.statusNotSaved"));
    }
  };

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
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {t("dashboard.navigation.guestReports")}
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  {t("dashboard.guestReportsPage.description")}
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={filter}
                onValueChange={(value) =>
                  value && selectFilter(value as StatusFilter)
                }
                variant="outline"
                className="flex-wrap"
              >
                {[...STATUSES, "all" as const].map((status) => (
                  <ToggleGroupItem key={status} value={status}>
                    {t(`dashboard.guestReportsPage.statuses.${status}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {state === "loading" ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-6" />
              </div>
            ) : null}

            {state === "adminOnly" || state === "error" ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {t(`dashboard.guestReportsPage.${state}Title`)}
                  </EmptyTitle>
                  <EmptyDescription>
                    {t(`dashboard.guestReportsPage.${state}Description`)}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {state === "ready" && reports.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {t("dashboard.guestReportsPage.emptyTitle")}
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : null}

            {state === "ready"
              ? reports.map((report) => (
                  <GuestReportCard
                    key={report.id}
                    report={report}
                    changeStatus={changeStatus}
                  />
                ))
              : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
