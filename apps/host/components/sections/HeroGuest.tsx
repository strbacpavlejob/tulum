"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LightRays } from "../ui/light-rays";
import SwipeScreen from "../ui/swipe-screen";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { faker } from "@faker-js/faker";
import MobileStoreButton from "../mobile-store-button";
import Phone from "../phone";

export default function HeroGuest() {
  const { t } = useTranslation();

  useEffect(() => {
    let player: any;

    const createPlayer = () => {
      if (!(window as any).YT?.Player) return;

      player = new (window as any).YT.Player("youtube-player", {
        videoId: "V9H0F0pfLNM",
        playerVars: {
          autoplay: 1,
          mute: 1,
          loop: 1,
          playlist: "V9H0F0pfLNM",
          controls: 0,
          modestbranding: 1,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            event.target.setPlaybackRate(0.75);
            event.target.playVideo();
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      createPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);

      (window as any).onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      player?.destroy?.();
    };
  }, []);

  return (
    <section id="hero-guest" className="relative w-full overflow-hidden">
      <div className="relative flex w-full flex-col items-center px-6">
        {/* Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Video layer (bottom) */}
          <div className="pointer-events-none absolute inset-0 z-0 scale-150 blur-sm">
            <div
              id="youtube-player"
              className="absolute left-1/2 top-1/2 h-[300%] w-[300%] -translate-x-1/2 -translate-y-1/2"
            />
            <div className="absolute inset-0 bg-background/60" />
          </div>
          {/* Gradient above video (translucent so video remains visible) */}
          <div className="absolute inset-0 z-10 h-full w-full rounded-b-xl [background:radial-gradient(125%_125%_at_50%_10%,color-mix(in_srgb,var(--background)_55%,transparent)_35%,color-mix(in_srgb,var(--primary)_50%,transparent)_100%)]" />
          {/* Rays above gradient */}
          <LightRays className="z-20" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto mt-4 flex w-full max-w-6xl flex-col md:flex-row items-center justify-between gap-10 pt-16 md:h-[800px]">
          {/* LEFT SIDE (text + buttons) */}
          <div className="flex flex-col items-center md:items-start gap-6 text-center md:text-left max-w-md">
            <h1 className="text-3xl md:text-5xl font-bold text-secondary">
              {t("landingpage.guest.hero.title")}
            </h1>

            <p className="text-sm md:text-base text-secondary/80">
              {t("landingpage.guest.hero.subtitle")}
            </p>

            {/* App Store Download Buttons */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <MobileStoreButton
                variant="web"
                link={process.env.NEXT_PUBLIC_TULUM_MOBILE_URL}
              />
              <div className="flex flex-wrap gap-2">
                <MobileStoreButton
                  variant="appStore"
                  link={process.env.NEXT_PUBLIC_TULUM_APP_STORE_URL}
                />
                <MobileStoreButton
                  variant="googlePlay"
                  link={process.env.NEXT_PUBLIC_TULUM_PLAY_STORE_URL}
                />
              </div>
            </div>

            {/* Avatar Social Proof
            <div className="flex items-center justify-center gap-3 md:px-1 px-4">
              <div className="flex -space-x-2.5">
                <AvatarCircles
                  numPeople={99}
                  avatarUrls={faker.helpers.arrayElements(
                    Array.from({ length: 5 }, () => ({
                      imageUrl: faker.image.personPortrait(),
                      profileUrl: faker.internet.url(),
                    })),
                    { min: 5, max: 5 },
                  )}
                />
              </div>
              <p className="text-xs text-secondary">
                {t("landingpage.guest.hero.socialProof")}
              </p>
            </div> */}
          </div>

          {/* RIGHT SIDE (phone) */}
          <div className="flex justify-center md:justify-end w-full md:w-auto -md:-translate-x-1/2">
            <Phone
              component={<SwipeScreen />}
              className="w-[220px] md:w-[320px] h-auto  drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
