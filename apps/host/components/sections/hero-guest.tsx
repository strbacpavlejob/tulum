"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocationsStore } from "@/store/locations";
import MobileStoreButton from "../mobile-store-button";

const INSTAGRAM_URL = "https://www.instagram.com/tulum_app/";
/** Below this, the hero leaves the live event count out. */
const LIVE_COUNT_MIN = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Events in the feed on tonight (already started, or starting before 6 am)
 * and starting within a week, as of when the feed was loaded. The feed only
 * has events that haven't ended.
 */
function liveEventCounts(events: { date?: string }[], at: number) {
  const morning = new Date(at);
  morning.setHours(6, 0, 0, 0);
  if (morning.getTime() <= at) morning.setDate(morning.getDate() + 1);
  let tonight = 0;
  let week = 0;
  for (const event of events) {
    const start = event.date ? Date.parse(event.date) : Number.NaN;
    if (Number.isNaN(start)) continue;
    if (start < morning.getTime()) tonight += 1;
    if (start < at + WEEK_MS) week += 1;
  }
  return { tonight, week };
}

export default function HeroGuest({
  showMaskenbal = false,
}: {
  /** Set while the /maskenbal poster link has an event to open. */
  showMaskenbal?: boolean;
}) {
  const { t } = useTranslation();
  const mobileUrl = process.env.NEXT_PUBLIC_TULUM_MOBILE_URL;
  const appStoreUrl = process.env.NEXT_PUBLIC_TULUM_APP_STORE_URL;
  const playStoreUrl = process.env.NEXT_PUBLIC_TULUM_PLAY_STORE_URL;
  const heroRef = useRef<HTMLElement | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const events = useLocationsStore((state) => state.locations);
  const fetchedAt = useLocationsStore((state) => state.lastFetched);
  const fetchLocations = useLocationsStore((state) => state.fetchLocations);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const counts = fetchedAt === null ? null : liveEventCounts(events, fetchedAt);
  const liveLine = !counts
    ? null
    : counts.tonight >= LIVE_COUNT_MIN
      ? t("landingpage.guest.hero.liveTonight", { count: counts.tonight })
      : counts.week >= LIVE_COUNT_MIN
        ? t("landingpage.guest.hero.liveWeek", { count: counts.week })
        : null;

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
            {showMaskenbal && (
              <Link
                href="/maskenbal"
                className="group inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-background/70 px-4 py-2 text-sm font-semibold text-secondary backdrop-blur-md transition-colors hover:border-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{t("landingpage.guest.hero.maskenbal")}</span>
                <span className="inline-flex items-center text-primary">
                  {t("landingpage.guest.hero.maskenbalCta")}
                  <ChevronRight
                    className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            )}

            <h1 className="text-3xl md:text-5xl font-bold text-secondary">
              {t("landingpage.guest.hero.title")}
            </h1>

            <p className="text-sm md:text-base text-secondary/80">
              {t("landingpage.guest.hero.subtitle")}
            </p>

            {liveLine && (
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
                />
                {liveLine}
              </p>
            )}

            {/* One main action, the web app. A store badge shows only once
                its URL is set, so the hero has no disabled buttons. */}
            <div className="flex flex-col items-center gap-3 lg:items-start">
              {mobileUrl && (
                <>
                  <a
                    href={mobileUrl}
                    className="group inline-flex h-12 items-center justify-center gap-1 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {t("landingpage.guest.hero.openTulum")}
                    <ChevronRight
                      className="size-5 transition-transform duration-300 ease-out group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </a>
                </>
              )}
              {appStoreUrl || playStoreUrl ? (
                <div className="flex flex-wrap gap-2">
                  {appStoreUrl && (
                    <MobileStoreButton variant="appStore" link={appStoreUrl} />
                  )}
                  {playStoreUrl && (
                    <MobileStoreButton
                      variant="googlePlay"
                      link={playStoreUrl}
                    />
                  )}
                </div>
              ) : (
                <p className="text-xs text-secondary/70"></p>
              )}
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
