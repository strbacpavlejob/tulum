"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ChartConfig } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  IconEye,
  IconBookmark,
  IconTicket,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import "../i18n";
import { EventDemographics } from "./event-stats/event-demographics";
import { EventEngagementChart } from "./event-stats/event-engagement-chart";
import { StatCard } from "./event-stats/stat-card";
import { ChartDataPoint, GENDER_COLORS } from "./event-stats/stats-data";

interface EventStatistics {
  seenCount: number;
  savedCount: number;
  ticketCount: number;
  visitedCount: number;
}

interface EventStatsData {
  eventStatistics: EventStatistics;
  chartData: ChartDataPoint[];
}

interface EventStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  eventVenue?: string;
  eventStatus?: string;
}

export function EventStatsDialog({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  eventVenue,
  eventStatus,
}: EventStatsDialogProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<EventStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/statistics?event_id=${eventId}`);
        if (!res.ok) throw new Error("Failed to fetch statistics");
        const data: EventStatsData = await res.json();
        setStats(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, eventId]);

  const s = stats?.eventStatistics;
  const conversionRate =
    s && s.seenCount > 0
      ? ((s.ticketCount / s.seenCount) * 100).toFixed(1)
      : "0.0";

  // Trim chart data to last 30 points for readability, skip all-zero leading entries
  const chartData = (stats?.chartData ?? [])
    .slice(-30)
    .filter(
      (_, i, arr) =>
        i >=
        arr.findIndex((d) => d.views > 0 || d.bookmarks > 0 || d.attended > 0),
    );

  // Mock gender/age data — placeholder until backend supports demographics
  const genderData = [
    { name: "Male", value: 54 },
    { name: "Female", value: 38 },
    { name: "Other", value: 8 },
  ];
  const genderChartConfig = {
    Male: { label: "Male", color: GENDER_COLORS[0] },
    Female: { label: "Female", color: GENDER_COLORS[1] },
    Other: { label: "Other", color: GENDER_COLORS[2] },
  } satisfies ChartConfig;

  const avgAge = 26;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {eventTitle}
            {eventStatus && (
              <Badge variant="secondary" className="font-normal capitalize">
                {eventStatus}
              </Badge>
            )}
          </DialogTitle>
          {eventVenue && <DialogDescription>{eventVenue}</DialogDescription>}
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={IconEye}
            label={t("dashboard.table.views")}
            value={s?.seenCount.toLocaleString() ?? "0"}
            loading={loading}
          />
          <StatCard
            icon={IconBookmark}
            label={t("dashboard.table.bookmarks")}
            value={s?.savedCount.toLocaleString() ?? "0"}
            loading={loading}
          />
          <StatCard
            icon={IconTicket}
            label={t("dashboard.table.attendees")}
            value={s?.ticketCount.toLocaleString() ?? "0"}
            sub={`${s?.visitedCount ?? 0} visited`}
            loading={loading}
          />
          <StatCard
            icon={IconTrendingUp}
            label={t("dashboard.table.conversionRate")}
            value={loading ? "—" : `${conversionRate}%`}
            sub="tickets / views"
            loading={loading}
          />
        </div>

        {/* Engagement Chart */}
        <EventEngagementChart loading={loading} chartData={chartData} />

        {/* Demographics row */}
        <EventDemographics
          genderChartConfig={genderChartConfig}
          genderData={genderData}
          avgAge={avgAge}
        />
      </DialogContent>
    </Dialog>
  );
}
