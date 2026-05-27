"use client";

import { DateCard } from "@/components/common/date-card";
import { StyledMap } from "@/components/styled-map";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { Progress } from "@/components/ui/progress";
import { MapPin, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { faker } from "@faker-js/faker";
import { useTranslation } from "react-i18next";

const EventLogoSVG = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    id="Logo"
  >
    <g id="logomark">
      <path
        d="M20 0C25.3043 4.00466e-07 30.3919 2.10669 34.1426 5.85742C34.8157 6.53058 35.4354 7.24719 36 8H20C16.8174 8 13.7651 9.26421 11.5146 11.5146C9.26421 13.7651 8 16.8174 8 20H20L36.9102 9.31934C38.1656 11.3074 39.0611 13.5027 39.5547 15.8027L32 20H40L39.9941 20.4971C39.8669 25.6213 37.776 30.5092 34.1426 34.1426C30.3919 37.8933 25.3043 40 20 40C14.6957 40 9.60815 37.8933 5.85742 34.1426C5.18426 33.4694 4.56459 32.7528 4 32H20C23.1826 32 26.2349 30.7358 28.4854 28.4854C30.5952 26.3755 31.8383 23.5608 31.9854 20.5947L32 20H20L3.08984 30.6787C1.83452 28.6906 0.941002 26.4951 0.447266 24.1953L8 20H0C8.00931e-07 14.6957 2.1067 9.60815 5.85742 5.85742C9.60815 2.1067 14.6957 -5.79361e-10 20 0Z"
        fill="#0094F7"
      ></path>
    </g>
  </svg>
);

export function VibeScreen() {
  const { t } = useTranslation();
  const capacity = 120;
  const goingCount = 87;
  const freeSpots = capacity - goingCount;
  const progressValue = (goingCount / capacity) * 100;

  const location = {
    id: "1",
    name: "Neon Terrace",
    latitude: 44.8125,
    longitude: 20.4489,
    capacity,
    type: "club",
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* Hero */}
      <div className="relative h-[32%] shrink-0 overflow-hidden">
        <img
          src={`https://images.unsplash.com/photo-1570872626485-d8ffea69f463?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`}
          className="h-full w-full object-cover"
          alt="Neon Terrace"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 shrink-0 border-2 border-white/30 shadow-lg">
              <div className="flex h-full w-full items-center justify-center bg-background rounded-full">
                <EventLogoSVG />
              </div>
            </Avatar>

            <div className="min-w-0 pb-1">
              <p className="text-2xl font-bold leading-tight">Neon Terrace</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["House music", "Cocktails", "Rooftop"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white/90 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-5 px-5 pt-5 pb-3">
        {/* Description + Date */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-foreground/70">
              {t("landingpage.screens.vibe.eventDescription")}
            </p>
          </div>

          <div className="shrink-0">
            <DateCard dateString="2026-04-12T23:00:00" />
          </div>
        </div>

        {/* Map */}
        <div className="h-40 w-full overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/5">
          <StyledMap
            locations={[location]}
            selectedLocation={null}
            onLocationSelect={() => {}}
            markerSize="md"
            disablePopOver
          />
        </div>

        {/* Address */}
        <div className="flex items-center gap-2 text-sm text-foreground/60">
          <MapPin className="h-4 w-4 text-foreground" />
          <span>{t("landingpage.screens.vibe.address")}</span>
        </div>

        {/* Guests */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-foreground/50">
            <span>{t("landingpage.screens.vibe.going")}</span>
            <span>
              {goingCount}/{capacity}
            </span>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <div className="flex -space-x-3">
              <AvatarCircles
                numPeople={82}
                avatarUrls={faker.helpers.arrayElements(
                  Array.from({ length: 5 }, () => ({
                    imageUrl: faker.image.personPortrait(),
                    profileUrl: faker.internet.url(),
                  })),
                  { min: 5, max: 5 },
                )}
              />
            </div>
          </div>

          <Progress value={progressValue} className="h-1.5" />

          <p className="mt-1 text-xs text-foreground/40">
            {freeSpots > 0
              ? t("landingpage.screens.vibe.spotsLeft", { count: freeSpots })
              : t("landingpage.screens.vibe.full")}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground shadow-lg">
          {t("landingpage.screens.vibe.attend")}
          <UserPlus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
