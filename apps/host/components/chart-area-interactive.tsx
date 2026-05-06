"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useTranslation } from "react-i18next";

import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useStatisticsStore } from "@/store/statistics";
import "../i18n";

export const description = "An interactive area chart";

interface ChartAreaInteractiveProps {
  venueId?: string | null;
  eventId?: string | null;
}

export function ChartAreaInteractive(_props: ChartAreaInteractiveProps = {}) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = React.useState("90d");

  const { chartData, isLoading } = useStatisticsStore();

  const chartConfig = {
    engagement: {
      label: t("dashboard.chart.eventEngagement"),
    },
    views: {
      label: t("dashboard.chart.eventViews"),
      color: "var(--chart-1)",
    },
    bookmarks: {
      label: t("dashboard.table.bookmarks"),
      color: "var(--chart-3)",
    },
    attended: {
      label: t("dashboard.chart.attended"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t("dashboard.chart.eventEngagementTrends")}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {t("dashboard.chart.eventViewsBookmarksOverTime")}
          </span>
          <span className="@[540px]/card:hidden">
            {t("dashboard.chart.viewsBookmarksOverTime")}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">
              {t("dashboard.chart.last3Months")}
            </ToggleGroupItem>
            <ToggleGroupItem value="30d">
              {t("dashboard.chart.last30Days")}
            </ToggleGroupItem>
            <ToggleGroupItem value="7d">
              {t("dashboard.chart.last7Days")}
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder={t("dashboard.chart.last3Months")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                {t("dashboard.chart.last3Months")}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                {t("dashboard.chart.last30Days")}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                {t("dashboard.chart.last7Days")}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoading ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <div className="text-sm text-muted-foreground">
              {t("dashboard.chart.loading", {
                defaultValue: "Loading chart data...",
              })}
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-views)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-views)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillBookmarks" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-bookmarks)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-bookmarks)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillAttended" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-attended)"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-attended)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="attended"
                type="natural"
                fill="url(#fillAttended)"
                stroke="var(--color-attended)"
                stackId="a"
              />
              <Area
                dataKey="bookmarks"
                type="natural"
                fill="url(#fillBookmarks)"
                stroke="var(--color-bookmarks)"
                stackId="a"
              />
              <Area
                dataKey="views"
                type="natural"
                fill="url(#fillViews)"
                stroke="var(--color-views)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
