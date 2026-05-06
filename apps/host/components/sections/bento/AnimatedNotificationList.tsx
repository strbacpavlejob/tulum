"use client";

import { AnimatedList } from "@/components/ui/animated-list";
import { cn } from "@/lib/utils";

interface NotificationItem {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

let notifications = [
  {
    name: "New booking",
    description: "Villa Sunset",
    time: "2m ago",
    icon: "🏠",
    color: "oklch(var(--primary))",
  },
  {
    name: "Payment received",
    description: "$450.00",
    time: "5m ago",
    icon: "💸",
    color: "#00C9A7",
  },
  {
    name: "New guest review",
    description: "5 stars ⭐",
    time: "10m ago",
    icon: "⭐",
    color: "#FFB800",
  },
  {
    name: "Message received",
    description: "Guest inquiry",
    time: "15m ago",
    icon: "💬",
    color: "#FF3D71",
  },
  {
    name: "Calendar updated",
    description: "3 new events",
    time: "20m ago",
    icon: "📅",
    color: "#1E86FF",
  },
];

notifications = Array.from({ length: 10 }, () => notifications).flat();

const Notification = ({
  name,
  description,
  icon,
  color,
  time,
}: NotificationItem) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-full cursor-pointer overflow-hidden rounded-2xl p-4",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center text-lg font-medium whitespace-pre dark:text-white">
            <span className="text-sm sm:text-lg">{name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-gray-500">{time}</span>
          </figcaption>
          <p className="text-sm font-normal dark:text-white/60">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

export const AnimatedNotificationList = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "absolute inset-0 flex w-full flex-col overflow-hidden p-2",
        className,
      )}
    >
      <AnimatedList>
        {notifications.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t"></div>
    </div>
  );
};
