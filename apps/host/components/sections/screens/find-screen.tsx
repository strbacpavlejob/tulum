"use client";

import { faker } from "@faker-js/faker";
import { useTranslation } from "react-i18next";

const EMOJIS = ["🍒", "🔥", "🌙", "⚡️", "🍸", "🎧", "💫", "🖤", "🪩", "🍑"];

export function FindScreen() {
  const { t } = useTranslation();
  const emoji = faker.helpers.arrayElement(EMOJIS);
  const rgb = faker.color.rgb();
  return (
    <div
      className="relative h-full w-full overflow-hidden font-sans"
      style={{ backgroundColor: rgb }}
    >
      {/* Overlay for contrast (theme aware) */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-5 pt-14 pb-6">
        {/* Header */}
        <div className="flex flex-col items-center">
          <p className="mb-2 text-xl uppercase tracking-widest">
            {t("landingpage.screens.find.title")}
          </p>
          <p className="mb-4 text-lg font-semibold opacity-70">
            {t("landingpage.screens.find.pairCode")}
          </p>
        </div>

        {/* Center */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-9xl mb-4">{emoji}</div>

          <div className="h-3 w-3 rounded-full shadow-sm mb-2" />
        </div>

        {/* Bottom */}
        <p className="text-center text-sm opacity-70 leading-relaxed">
          {t("landingpage.screens.find.description")}
        </p>
      </div>
    </div>
  );
}
