"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
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
