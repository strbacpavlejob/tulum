"use client";

import { IconChartBar, IconUsers } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import { GENDER_COLORS } from "./stats-data";

interface EventDemographicsProps {
  genderChartConfig: {
    Male: { label: string; color: string };
    Female: { label: string; color: string };
    Other: { label: string; color: string };
  };
  genderData: { name: string; value: number }[];
  avgAge: number;
}

export function EventDemographics({
  genderChartConfig,
  genderData,
  avgAge,
}: EventDemographicsProps) {
  return (
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
                <span className="text-[9px] text-muted-foreground">{age}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
