"use client";

import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface StatisticCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: number;
  footer?: {
    label: string;
    description: string;
  };
}

export function StatisticCard({
  value,
  description,
  trend,
  footer,
}: StatisticCardProps) {
  const trendDirection =
    trend !== undefined ? (trend >= 0 ? "up" : "down") : undefined;
  const TrendIcon =
    trendDirection === "down" ? IconTrendingDown : IconTrendingUp;
  const trendValue =
    trend !== undefined ? `${trend > 0 ? "+" : ""}${trend}%` : undefined;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value ?? "—"}
        </CardTitle>
        {trend !== undefined && (
          <CardAction>
            <Badge variant="outline">
              <TrendIcon
                className={
                  trendDirection === "up" ? "text-green-500" : "text-red-500"
                }
              />
              {trendValue}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {footer && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {footer.label}
          </div>
          <div className="text-muted-foreground">{footer.description}</div>
        </CardFooter>
      )}
    </Card>
  );
}
