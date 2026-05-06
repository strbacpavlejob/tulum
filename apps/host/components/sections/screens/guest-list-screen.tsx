"use client";

import { Mars, UserPlus, Venus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { faker } from "@faker-js/faker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export function GuestListScreen() {
  const { t } = useTranslation();
  const capacity = 120;
  const goingCount = 87;
  const freeSpots = capacity - goingCount;
  const progressValue = (goingCount / capacity) * 100;

  const guests = Array.from({ length: goingCount }).map((_, i) => {
    const gender = faker.helpers.arrayElement(["female", "male"]);
    return {
      id: i,
      gender,
      name: faker.person.firstName(gender as "female" | "male"),
      age: faker.number.int({ min: 21, max: 32 }),
      avatar: `https://i.pravatar.cc/150?img=${faker.number.int({
        min: 1,
        max: 70,
      })}`,
    };
  });

  const femaleCount = guests.filter((g) => g.gender === "female").length;
  const maleCount = guests.filter((g) => g.gender === "male").length;

  const avgAge = Math.round(
    guests.reduce((sum, g) => sum + g.age, 0) / guests.length,
  );

  const visibleGuests = guests.slice(0, 6);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background/80 p-8 pt-14 font-sans text-foreground">
      {/* Top content */}
      <div className="min-h-0 flex-1">
        {/* Event info */}
        <p className="mb-1 text-xl font-bold">Neon Terrace</p>
        <p className="mb-5 text-sm text-foreground/50">Friday · 11:00 PM</p>

        {/* Capacity */}
        <div className="mb-5 rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {t("landingpage.screens.guestList.freeSpaces")}
            </p>
            <p className="text-sm text-foreground/60">
              {goingCount}/{capacity}
            </p>
          </div>

          <Progress value={progressValue} className="h-2" />

          <p className="mt-2 text-xs text-foreground/50">
            {freeSpots > 0
              ? t("landingpage.screens.guestList.spotsLeft", {
                  count: freeSpots,
                })
              : t("landingpage.screens.guestList.eventFull")}
          </p>
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-2 text-sm">
          <p className="flex items-center gap-3 text-sm text-foreground/70">
            <span className="flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-1">
              <Venus className="h-4 w-4 text-pink-400" />
              {femaleCount}
            </span>

            <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1">
              <Mars className="h-4 w-4 text-blue-400" />
              {maleCount}
            </span>
          </p>

          <p className="text-foreground/60">
            {t("landingpage.screens.guestList.avgAge")}{" "}
            <span className="font-medium text-foreground">{avgAge}</span>
          </p>
        </div>

        {/* Guest list */}
        <div className="rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm uppercase tracking-widest text-foreground/40">
              {t("landingpage.screens.guestList.guestListLabel")}
            </p>
            <p className="text-xs text-foreground/40">
              {t("landingpage.screens.guestList.more", {
                count: goingCount - visibleGuests.length,
              })}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {visibleGuests.map((guest, i) => {
              const blurClass =
                i < 3
                  ? ""
                  : i === 3
                    ? "blur-[1px]"
                    : i === 4
                      ? "blur-[2px]"
                      : "blur-[3px]";

              return (
                <div
                  key={guest.id}
                  className="flex items-center gap-3 rounded-xl bg-background/40 px-3 py-2"
                >
                  <Avatar
                    className={`h-10 w-10 border border-foreground/10 ${blurClass}`}
                  >
                    <AvatarImage
                      src={guest.avatar}
                      alt={guest.name}
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {guest.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className={blurClass}>
                    <p className="text-sm font-medium">
                      {guest.name}, {guest.age}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attend button */}
      <div className="mt-4 shrink-0">
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground shadow-lg">
          {t("landingpage.screens.guestList.attend")}
          <UserPlus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
