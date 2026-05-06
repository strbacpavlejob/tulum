"use client";

import { cn } from "@/lib/utils";
import { AnimatedList } from "./ui/animated-list";
import { formatDistanceToNowStrict, subSeconds } from "date-fns";
import { useTranslation } from "react-i18next";
import { getDateLocale } from "@/lib/locale";

interface Item {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDecreasingOffsets(count: number) {
  const offsets: number[] = [];
  let currentMax = 60 * 20; // up to 20 minutes ago for the first one

  for (let i = 0; i < count; i++) {
    const min = i === count - 1 ? 5 : 10;
    const offset = getRandomInt(min, currentMax);
    offsets.push(offset);

    // next notification must be more recent than this one
    currentMax = offset - 5;

    if (currentMax <= 5) {
      currentMax = 5;
    }
  }

  return offsets;
}

const Notification = ({ name, description, icon, time }: Item) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4",
        // animation styles
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        // light styles
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // dark styles
        "transform-gpu dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-foreground/20">
          <span className="text-sm">{icon}</span>
        </div>
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

export function AnimatedListDemo({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();

  const baseNotifications = [
    {
      name: t("landingpage.features.notifications.examples.nearbyEvent.title"),
      description: t(
        "landingpage.features.notifications.examples.nearbyEvent.description",
      ),
      icon: "📍",
      color: "primary",
    },
    {
      name: t(
        "landingpage.features.notifications.examples.eventStarting.title",
      ),
      description: t(
        "landingpage.features.notifications.examples.eventStarting.description",
      ),
      icon: "⏳",
      color: "secondary",
    },
    {
      name: t("landingpage.features.notifications.examples.matchGoing.title"),
      description: t(
        "landingpage.features.notifications.examples.matchGoing.description",
      ),
      icon: "👀",
      color: "tertiary",
    },
    {
      name: t("landingpage.features.notifications.examples.fillingFast.title"),
      description: t(
        "landingpage.features.notifications.examples.fillingFast.description",
      ),
      icon: "🔥",
      color: "#00C9A7",
    },
  ];

  const offsets = generateDecreasingOffsets(baseNotifications.length);

  const notifications = baseNotifications.map((notification, index) => ({
    ...notification,
    time: formatDistanceToNowStrict(subSeconds(new Date(), offsets[index]), {
      addSuffix: true,
      locale: getDateLocale(i18n.language),
    }),
  }));

  return (
    <div
      className={cn(
        "relative flex h-[500px] w-full flex-col overflow-hidden p-2",
        className,
      )}
    >
      <AnimatedList>
        {notifications.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>

      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t"></div>
    </div>
  );
}
