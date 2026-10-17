"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import MobileStoreButton from "../mobile-store-button";

export default function HeroGuest() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setShowScrollHint(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={heroRef}
      id="hero-guest"
      className="scroll-mt-28 relative w-full overflow-hidden"
    >
      <div className="relative flex w-full flex-col items-center px-6">
        <div
          aria-hidden="true"
          className="nightclub-background absolute inset-0 z-0"
        >
          <div className="nightclub-pulse" />
          <div className="nightclub-dancers">
            <span className="nightclub-dancer nightclub-dancer-left" />
            <span className="nightclub-dancer nightclub-dancer-right" />
          </div>
          <div className="nightclub-overlay" />
        </div>

        <div className="relative z-10 mx-auto mt-4 flex w-full max-w-6xl flex-col items-center justify-between gap-10 pt-16 lg:h-[800px] lg:flex-row">
          <div className="flex max-w-md flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <h1 className="text-3xl md:text-5xl font-bold text-secondary">
              {t("landingpage.guest.hero.title")}
            </h1>

            <p className="text-sm md:text-base text-secondary/80">
              {t("landingpage.guest.hero.subtitle")}
            </p>

            {/* App Store Download Buttons */}
            <div className="flex flex-col items-center gap-2 lg:items-start">
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
          </div>

          <div className="flex w-full max-w-3xl items-center justify-center lg:w-auto lg:max-w-none lg:flex-1 lg:min-w-0">
            <Image
              src="/images/mascots/swipe-image.png"
              alt=""
              width={1024}
              height={1536}
              sizes="(max-width: 639px) 76vw, (max-width: 1023px) 384px, 32vw"
              className="mx-auto h-auto w-[min(76vw,24rem)] max-w-full object-contain drop-shadow-2xl lg:w-[min(32vw,28rem)]"
              preload
              fetchPriority="high"
            />
          </div>
        </div>
      </div>

      {showScrollHint && (
        <a
          href="#map"
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-secondary/30 bg-background/85 px-4 py-2 text-xs font-semibold text-secondary shadow-lg backdrop-blur-md motion-safe:animate-bounce lg:hidden"
        >
          <span>{t("landingpage.guest.hero.scrollHint")}</span>
          <ChevronDown className="size-4" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
