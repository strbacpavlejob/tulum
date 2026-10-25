"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { IconChevronDown } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import "../../../i18n";

const STATUSES: GuestReportStatus[] = [
  "pending",
  "in_review",
  "resolved",
  "rejected",
];

type StatusFilter = GuestReportStatus | "all";

// Reasons that may need someone to act quickly.
const URGENT_REASONS = new Set<GuestReport["reason"]>([
  "harassment",
  "underage",
  "unsafe_meeting",
]);

/**
 * Guest reports for Tulum admins (TASK-001). Guests report each other from
 * a profile or a chat in the app; reporting also blocked the guest for the
 * reporter. The API answers 403 to anyone who isn't an admin.
 */
export default function GuestReportsPage() {
  const { t, i18n } = useTranslation();
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

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(i18n.language, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

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
                  <Card key={report.id}>
                    <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              URGENT_REASONS.has(report.reason)
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {t(
                              `dashboard.guestReportsPage.reasons.${report.reason}`,
                            )}
                          </Badge>
                          <Badge variant="outline">
                            {t(
                              `dashboard.guestReportsPage.sources.${report.source}`,
                            )}
                          </Badge>
                        </div>
                        <CardTitle>
                          {report.reported?.name ??
                            t("dashboard.guestReportsPage.deletedAccount")}
                        </CardTitle>
                        <CardDescription>
                          {t("dashboard.guestReportsPage.reportedBy", {
                            name:
                              report.reporter?.name ??
                              t("dashboard.guestReportsPage.deletedAccount"),
                            date: formatDate(report.created_at),
                          })}
                        </CardDescription>
                      </div>
                      <Select
                        value={report.status}
                        onValueChange={(status) =>
                          void changeStatus(report, status)
                        }
                      >
                        <SelectTrigger
                          className="w-40"
                          aria-label={t("dashboard.guestReportsPage.status")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {t(
                                `dashboard.guestReportsPage.statuses.${status}`,
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4 text-sm">
                      {report.reported ? (
                        <div className="flex flex-wrap gap-4">
                          {report.reported.photos.length > 0 ? (
                            <div className="flex gap-2">
                              {report.reported.photos.map((photo) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={photo}
                                  src={photo}
                                  alt=""
                                  className="size-24 rounded-lg object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                          <div className="flex min-w-48 flex-1 flex-col gap-1">
                            {report.reported.report_count > 1 ? (
                              <span className="font-medium text-destructive">
                                {t("dashboard.guestReportsPage.reportCount", {
                                  count: report.reported.report_count,
                                })}
                              </span>
                            ) : null}
                            {report.reported.bio ? (
                              <p className="text-muted-foreground">
                                {report.reported.bio}
                              </p>
                            ) : null}
                            <span className="text-muted-foreground font-mono text-xs">
                              {report.reported.user_id}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {report.event ? (
                        <p>
                          <span className="text-muted-foreground">
                            {t("dashboard.guestReportsPage.event")}:{" "}
                          </span>
                          {report.event.title}
                          {report.event.start_date_time
                            ? ` · ${formatDate(report.event.start_date_time)}`
                            : ""}
                        </p>
                      ) : null}

                      {report.details ? (
                        <blockquote className="border-l-2 pl-3 whitespace-pre-wrap">
                          {report.details}
                        </blockquote>
                      ) : null}

                      {report.messages && report.messages.length > 0 ? (
                        <Collapsible>
                          <CollapsibleTrigger className="text-primary flex items-center gap-1 font-medium">
                            {t("dashboard.guestReportsPage.showChat", {
                              count: report.messages.length,
                            })}
                            <IconChevronDown className="size-4" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 flex flex-col gap-1.5">
                            {report.messages.map((message, index) => (
                              <div key={index} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0 tabular-nums">
                                  {formatDate(message.sent_at)}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {t(
                                    `dashboard.guestReportsPage.from.${message.from}`,
                                  )}
                                  :
                                </span>
                                <span className="whitespace-pre-wrap break-words">
                                  {message.message}
                                </span>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : null}

                      {report.reviewed_at ? (
                        <p className="text-muted-foreground text-xs">
                          {t("dashboard.guestReportsPage.reviewedBy", {
                            name:
                              report.reviewed_by ??
                              t("dashboard.guestReportsPage.deletedAccount"),
                            date: formatDate(report.reviewed_at),
                          })}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
