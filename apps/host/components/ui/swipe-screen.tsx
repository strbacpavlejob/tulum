"use client";

import { Heart, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

const PROFILE = {
  age: 28,
  image: "https://mockmind-api.uifaces.co/content/human/127.jpg",
  nameKey: "swipeScreen.profiles.ana.name",
  interestKeys: [
    "swipeScreen.profiles.ana.tags.music",
    "swipeScreen.profiles.ana.tags.dancing",
    "swipeScreen.profiles.ana.tags.travel",
  ],
};

export default function SwipeScreen() {
  const { t } = useTranslation();

  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#111015] text-white"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(13, 12, 18, 0.58) 0%, rgba(13, 12, 18, 0.08) 30%, rgba(13, 12, 18, 0.14) 48%, rgba(13, 12, 18, 0.88) 72%, #111015 100%), url("${PROFILE.image}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-[clamp(6px,3cqw,12px)] px-[clamp(12px,5cqw,19px)] pt-[clamp(8px,5.5cqw,21px)]">
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-black tracking-tight text-white"
            style={{
              fontSize: "clamp(8px, 7.5cqw, 28px)",
              lineHeight: 1.1,
            }}
          >
            {t("swipeScreen.venueName")}
          </h2>
          <div className="mt-[clamp(4px,2cqw,8px)] flex items-center gap-[clamp(4px,2cqw,8px)] text-white/90">
            <span className="size-[clamp(4px,2cqw,8px)] shrink-0 rounded-full bg-[#a6f8ac]" />
            <p className="truncate text-[clamp(6px,3cqw,12px)] font-medium">
              {t("swipeScreen.peopleHere", { count: 59 })}
              <span className="px-[clamp(2px,1.5cqw,6px)] text-white/65">
                |
              </span>
              <span className="text-white/80">
                {t("swipeScreen.matchingLive")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex size-[clamp(18px,11cqw,44px)] shrink-0 items-center justify-center rounded-[clamp(6px,4cqw,16px)] border border-white/25 bg-white/15 text-white backdrop-blur-sm">
          <SlidersHorizontal className="size-[clamp(10px,4.5cqw,18px)]" />
        </div>
      </div>

      <div className="mt-auto shrink-0 px-[clamp(12px,5cqw,19px)] pb-[clamp(6px,4cqw,15px)]">
        <h3
          className="font-black tracking-tight text-white"
          style={{
            fontSize: "clamp(8px, 9.5cqw, 38px)",
            lineHeight: 1.05,
          }}
        >
          {t(PROFILE.nameKey)}, {PROFILE.age}
        </h3>

        <div className="mt-[clamp(4px,3cqw,12px)] flex flex-wrap gap-[clamp(4px,2cqw,8px)]">
          {PROFILE.interestKeys.map((interestKey) => (
            <span
              key={interestKey}
              className="rounded-full border border-white/40 bg-white/15 px-[clamp(6px,3cqw,11px)] py-[clamp(3px,1.5cqw,6px)] text-[clamp(7px,3cqw,12px)] font-semibold text-white/95"
            >
              {t(interestKey)}
            </span>
          ))}
        </div>

        <p className="mt-[clamp(4px,3cqw,12px)] text-[clamp(7px,3.25cqw,13px)] leading-[1.5] text-white/90">
          {PROFILE.interestKeys.map((interestKey) => t(interestKey)).join(", ")}
        </p>

        <div className="mt-[clamp(6px,5cqw,19px)] flex flex-wrap items-center justify-between gap-[clamp(4px,2cqw,8px)]">
          <div className="flex items-center gap-[clamp(4px,2cqw,8px)] whitespace-nowrap text-[#ddd6e7]">
            <Heart className="size-[clamp(10px,5cqw,20px)] shrink-0" />
            <span className="text-[clamp(6px,3.5cqw,14px)] font-extrabold">
              0 {t("swipeScreen.likesLeft")}
            </span>
          </div>
          <button
            className="flex h-[clamp(18px,15cqw,57px)] min-h-[18px] min-w-[clamp(68px,34cqw,129px)] shrink-0 items-center justify-center gap-[clamp(4px,2cqw,8px)] rounded-[clamp(4px,5cqw,19px)] bg-[#504b58] px-[clamp(8px,4cqw,15px)] text-[clamp(7px,3.5cqw,14px)] font-bold text-[#c7c1cf]"
            disabled
            type="button"
          >
            <Heart className="size-[clamp(9px,4.5cqw,18px)]" />
            {t("swipeScreen.noLikesLeft")}
          </button>
        </div>
      </div>
    </div>
  );
}
