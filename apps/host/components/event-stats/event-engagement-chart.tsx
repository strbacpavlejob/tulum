"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { ChartDataPoint } from "./stats-data";

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

interface EventEngagementChartProps {
  loading: boolean;
  chartData: ChartDataPoint[];
}

export function EventEngagementChart({
  loading,
  chartData,
}: EventEngagementChartProps) {
  const { t } = useTranslation();
  return (
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
        <ChartContainer config={engagementChartConfig} className="h-40 w-full">
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
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBookmarks" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gAttended" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-3)"
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
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
  );
}
