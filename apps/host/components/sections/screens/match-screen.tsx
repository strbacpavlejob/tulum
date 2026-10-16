"use client";

import { HeartRipple } from "@/components/heart-ripple";
import { SendHorizonal, X } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export function MatchScreen() {
  const { t } = useTranslation();
  const avatar1 = "https://mockmind-api.uifaces.co/content/human/218.jpg";
  const avatar2 = "https://mockmind-api.uifaces.co/content/human/207.jpg";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background/80 px-5 pt-14 pb-5 font-sans text-foreground">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <HeartRipple
          className="h-[520px] w-[520px]"
          mainCircleSize={120}
          mainCircleOpacity={0.22}
          numCircles={6}
        />
      </div>

      {/* Close */}
      <button
        type="button"
        className="absolute top-8 right-8 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-foreground/60"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
      <div className="relative mb-6 h-28 w-[220px] shrink-0">
        <Avatar className="absolute left-2.5 top-0 h-28 w-28 border-2 border-background">
          <AvatarImage
            src={avatar1}
            alt="Match profile"
            className="object-cover"
            loading="lazy"
          />
        </Avatar>

        <Avatar className="absolute right-2.5 top-0 h-28 w-28 border-2 border-background">
          <AvatarImage
            src={avatar2}
            alt="Your profile"
            className="object-cover"
            loading="lazy"
          />
        </Avatar>
      </div>
      <p className="mb-2 text-5xl font-bold tracking-tight">
        {t("landingpage.screens.match.title")}
      </p>
      <p className="max-w-[280px] text-sm leading-relaxed text-foreground/60">
        {t("landingpage.screens.match.description")}
      </p>
      </div>

      <div className="relative z-10 mt-4 shrink-0">
      <div className="flex items-center justify-between rounded-full bg-foreground/10 px-4 py-2.5">
        <span className="text-sm text-foreground/60">
          {t("landingpage.screens.match.messagePlaceholder")}
        </span>
        <SendHorizonal className="h-5 w-5 text-foreground/60" />
      </div>
      </div>
    </div>
  );
}
