"use client";

import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { LightRays } from "../ui/light-rays";

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section id="hero" className="w-full relative">
      <div className="relative flex flex-col items-center w-full px-6">
        {/* Gradient Background */}
        <div className="absolute inset-0 z-0">
          <LightRays />
          <div className="absolute inset-0 -z-10 h-full w-full [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,var(--primary)_100%)] rounded-b-xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 pt-32 max-w-3xl mx-auto h-full w-full flex flex-col gap-10 items-center justify-center md:h-[600px]">
          <div className="flex flex-col items-center justify-center gap-5">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-medium tracking-tighter text-balance text-center text-secondary">
              {t("landingpage.hero.title")}
            </h1>
            <p className="text-base md:text-lg text-center text-muted-foreground font-medium text-balance leading-relaxed tracking-tight">
              {t("landingpage.hero.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            <Link href="/sign-up">
              <Button className="bg-primary h-9 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-secondary-foreground dark:text-primary-foreground px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-primary/80 transition-all ease-out active:scale-95">
                {t("landingpage.hero.postEvent")}
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button
                variant="outline"
                className="h-10 flex items-center justify-center px-5 text-sm font-normal tracking-wide text-secondary rounded-full transition-all ease-out active:scale-95 bg-white dark:bg-background border border-[#E5E7EB] dark:border-[#27272A] hover:bg-white/80 dark:hover:bg-background/80"
              >
                {t("landingpage.hero.logiIn")}
              </Button>
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "500+", label: t("landingpage.hero.stats.venues") },
              { number: "50k+", label: t("landingpage.hero.stats.users") },
              { number: "85%", label: t("landingpage.hero.stats.attendance") },
              { number: "2.5x", label: t("landingpage.hero.stats.moreGuests") },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-secondary mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-secondary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
