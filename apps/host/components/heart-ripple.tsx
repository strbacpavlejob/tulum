import React, { type ComponentPropsWithoutRef } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeartRippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
}

export const HeartRipple = React.memo(function HeartRipple({
  mainCircleSize = 120,
  mainCircleOpacity = 0.22,
  numCircles = 6,
  className,
  ...props
}: HeartRippleProps) {
  return (
    <div
      className={cn("pointer-events-none  inset-0 select-none", className)}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 56;
        const opacity = Math.max(0.04, mainCircleOpacity - i * 0.03);

        return (
          <Heart
            key={i}
            className="absolute left-1/2 top-1/2 animate-ripple text-primary fill-primary"
            style={{
              width: size,
              height: size,
              opacity,
              animationDelay: `${i * 0.08}s`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
});

HeartRipple.displayName = "HeartRipple";
