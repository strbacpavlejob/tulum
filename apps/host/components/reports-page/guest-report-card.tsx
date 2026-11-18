"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { STATUSES, URGENT_REASONS } from "./report-statuses";
import type { GuestReport } from "@/lib/api-client";

interface GuestReportCardProps {
  report: GuestReport;
  changeStatus: (report: GuestReport, status: string) => Promise<void>;
}

export function GuestReportCard({
  report,
  changeStatus,
}: GuestReportCardProps) {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(i18n.language, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                URGENT_REASONS.has(report.reason) ? "destructive" : "secondary"
              }
            >
              {t(`dashboard.guestReportsPage.reasons.${report.reason}`)}
            </Badge>
            <Badge variant="outline">
              {t(`dashboard.guestReportsPage.sources.${report.source}`)}
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
          onValueChange={(status) => void changeStatus(report, status)}
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
                {t(`dashboard.guestReportsPage.statuses.${status}`)}
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
                <p className="text-muted-foreground">{report.reported.bio}</p>
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
                    {t(`dashboard.guestReportsPage.from.${message.from}`)}:
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
  );
}
