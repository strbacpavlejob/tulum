"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  IconEye,
  IconBookmark,
  IconTicket,
  IconTrendingUp,
  IconUsers,
  IconChartBar,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import "../i18n";

interface EventStatistics {
  seenCount: number;
  savedCount: number;
  ticketCount: number;
  visitedCount: number;
}

interface ChartDataPoint {
  date: string;
  views: number;
  bookmarks: number;
  attended: number;
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

const engagementChartConfig = {
  views: {
    label: "Views",
    color: "var(--primary)",
  },
  bookmarks: {
    label: "Saved",
    color: "var(--chart-2)",
  },
  attended: {
    label: "Attended",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const GENDER_COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-5)"];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-1" />
      ) : (
        <span className="text-2xl font-bold tabular-nums">{value}</span>
      )}
      {sub && !loading && (
        <span className="text-xs text-muted-foreground">{sub}</span>
      )}
    </div>
  );
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
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">
            {t("dashboard.chart.engagementOverTime", "Engagement over time")}
          </h3>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
              No engagement data yet
            </div>
          ) : (
            <ChartContainer
              config={engagementChartConfig}
              className="h-40 w-full"
            >
              <AreaChart
                data={chartData}
                margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gBookmarks" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-2)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-2)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gAttended" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-3)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-3)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="views"
                  type="monotone"
                  fill="url(#gViews)"
                  stroke="var(--primary)"
                  strokeWidth={1.5}
                />
                <Area
                  dataKey="bookmarks"
                  type="monotone"
                  fill="url(#gBookmarks)"
                  stroke="var(--chart-2)"
                  strokeWidth={1.5}
                />
                <Area
                  dataKey="attended"
                  type="monotone"
                  fill="url(#gAttended)"
                  stroke="var(--chart-3)"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        {/* Demographics row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Gender Ratio */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconUsers className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Gender ratio</h3>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Coming soon
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <ChartContainer
                config={genderChartConfig}
                className="h-28 w-28 shrink-0"
              >
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={44}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={GENDER_COLORS[i]} opacity={0.4} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="flex flex-col gap-1.5">
                {genderData.map((g, i) => (
                  <div
                    key={g.name}
                    className="flex items-center gap-2 text-sm opacity-40"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: GENDER_COLORS[i] }}
                    />
                    <span className="text-muted-foreground">{g.name}</span>
                    <span className="font-medium tabular-nums ml-auto">
                      {g.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Average Age */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <IconChartBar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Average age</h3>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Coming soon
              </Badge>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold tabular-nums opacity-40">
                {avgAge}
              </span>
              <span className="text-muted-foreground mb-1 opacity-40">
                years old
              </span>
            </div>
            <div className="mt-3 flex gap-1 items-end h-12 opacity-40">
              {[18, 22, 26, 30, 35, 40, 45].map((age, i) => {
                const heights = [30, 60, 100, 80, 50, 25, 10];
                return (
                  <div
                    key={age}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <div
                      className="w-full rounded-sm bg-primary/50"
                      style={{ height: `${heights[i]}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {age}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
