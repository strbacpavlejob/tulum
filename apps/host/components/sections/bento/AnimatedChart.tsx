"use client";

import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const chartData = [
  { month: "January", visitors: 186 },
  { month: "February", visitors: 305 },
  { month: "March", visitors: 237 },
  { month: "April", visitors: 273 },
  { month: "May", visitors: 309 },
  { month: "June", visitors: 414 },
];

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "oklch(var(--primary))",
  },
} satisfies ChartConfig;

export const AnimatedChart = ({ className }: { className?: string }) => {
  return (
    <motion.div
      className={cn(
        "relative flex size-full items-center justify-center h-full overflow-hidden",
        className,
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative flex size-full items-center justify-center h-[250px] overflow-hidden p-2">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              opacity={0.5}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <defs>
              <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--primary)"
                  stopOpacity={0.3}
                />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              dataKey="visitors"
              type="natural"
              fill="url(#fillVisitors)"
              fillOpacity={1}
              stroke="var(--primary)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </motion.div>
  );
};
