"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import Logo from "../common/logo";

export default function CTAGuest() {
  const { t } = useTranslation();
  const mobileUrl = process.env.NEXT_PUBLIC_TULUM_MOBILE_URL;

  return (
    <section
      id="cta"
      className="scroll-mt-28 w-full px-4 py-8 sm:px-6 sm:py-10"
    >
      <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-6 overflow-hidden rounded-[2rem] border px-6 py-8 sm:gap-8 sm:px-10 sm:py-12 md:flex-row md:items-center md:justify-between">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-linear-to-br from-primary/15 via-background to-secondary/10" />
          <div className="absolute -left-16 -top-24 size-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-28 -right-12 size-96 rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex w-full items-start gap-4 text-left sm:gap-6 md:flex-1 md:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-background/60 p-3 shadow-2xl backdrop-blur-md sm:size-20">
            <Logo className="size-11 sm:size-14" />
          </div>

          <div className="min-w-0 flex-1 text-foreground">
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              {t("landingpage.ctaGuest.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t("landingpage.ctaGuest.subtitle")}
            </p>
            {mobileUrl ? (
              <a
                href={mobileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-5 inline-flex h-11 items-center justify-center rounded-full border border-input bg-background px-6 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("landingpage.ctaGuest.cta")}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-1 size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-input bg-muted px-6 text-sm font-medium text-muted-foreground"
              >
                {t("landingpage.guest.hero.comingSoon")}
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[7rem] sm:max-w-[8rem] md:mx-0 md:max-w-[18rem] md:flex-none">
          <Image
            src="/images/mascots/cta-image.png"
            alt=""
            width={1024}
            height={1536}
            sizes="(max-width: 639px) 112px, (max-width: 767px) 128px, 288px"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
