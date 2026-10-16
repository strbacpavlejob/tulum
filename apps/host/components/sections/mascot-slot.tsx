import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MascotSlotProps {
  name: string;
  className?: string;
  children?: ReactNode;
}

export function MascotSlot({ name, className, children }: MascotSlotProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("mascot-slot", className)}
      data-mascot-slot={name}
    >
      {children}
    </div>
  );
}
