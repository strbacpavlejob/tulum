"use client";

import {
  IconGenderFemale,
  IconGenderMale,
  IconUsers,
} from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface GuestProfileCardProps {
  title?: string;
  description?: string;
  genderStats: {
    female: number; // percentage 0-100
    male: number; // percentage 0-100
  };
  ageRange: {
    min: number;
    max: number;
    average: number;
  };
}

export function GuestProfileCard({
  title = "Ideal Guest Profile",
  genderStats,
  ageRange,
}: GuestProfileCardProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Age Range */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Age Range</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {ageRange.min}-{ageRange.max}
            </span>
            <span className="text-muted-foreground text-sm">years</span>
          </div>
          <div className="text-muted-foreground text-sm">
            Average age:{" "}
            <span className="font-medium text-foreground">
              {ageRange.average}
            </span>{" "}
            years
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
