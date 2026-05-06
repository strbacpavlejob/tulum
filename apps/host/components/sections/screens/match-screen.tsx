"use client";

import { HeartRipple } from "@/components/heart-ripple";
import { SendHorizonal, X } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

export function MatchScreen() {
  const { t } = useTranslation();
  const avatar1 = `https://mockmind-api.uifaces.co/content/human/218.jpg`;
  const avatar2 = `https://mockmind-api.uifaces.co/content/human/207.jpg`;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background/80 px-5 pt-8 pb-5 font-sans text-foreground">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
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
      <div className="relative top-16 z-10 mt-auto">
        {/* Text BELOW center */}
        <div className="relative z-10 mt-[55%] flex flex-col items-center text-center">
          <p className="mb-2 text-6xl font-bold tracking-tight">
            {t("landingpage.screens.match.title")}
          </p>
          <p className="max-w-6xl text-sm leading-relaxed text-foreground/60">
            {t("landingpage.screens.match.description")}
          </p>
        </div>
      </div>

      {/* Absolute center avatars */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-32 w-[220px]">
          <Avatar className="absolute left-2.5 top-0 h-32 w-32 border-2 border-background">
            <AvatarImage src={avatar1} className="object-cover" />
          </Avatar>

          <Avatar className="absolute right-2.5 top-0 h-32 w-32 border-2 border-background">
            <AvatarImage src={avatar2} className="object-cover" />
          </Avatar>
        </div>
      </div>

      {/* Bottom input */}
      <div className="relative z-10 mt-auto">
        <div className="rounded-full bg-foreground/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-lg text-foreground/60">
            {t("landingpage.screens.match.messagePlaceholder")}
          </span>
          <SendHorizonal className="h-5 w-5 text-foreground/60" />
        </div>
      </div>
    </div>
  );
}
