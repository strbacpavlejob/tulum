"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function CTA() {
  const { t } = useTranslation();

  return (
    <section
      id="cta"
      className="flex flex-col items-center justify-center w-full px-6 py-6"
    >
      <div className="w-full">
        <div className="h-[400px] md:h-[400px] overflow-hidden shadow-xl w-full border border-border rounded-xl bg-primary relative z-20">
          {/* Background Image */}
          <Image
            alt="CTA Background"
            src="/images/cta-background.webp"
            fill
            className="absolute inset-0 w-full h-full object-cover object-right md:object-center"
            sizes="100vw"
            quality={75}
          />

          <div className="absolute inset-0 -top-32 md:-top-40 flex flex-col items-center justify-center">
            <h1 className="text-white text-4xl md:text-7xl font-medium tracking-tighter max-w-xs md:max-w-xl text-center">
              {t("landingpage.cta.title")}
            </h1>
            <div className="absolute bottom-10 flex flex-col items-center justify-center gap-2">
              <Link
                className="bg-white text-black font-semibold text-sm h-10 w-fit px-4 rounded-full flex items-center justify-center shadow-md"
                href="/sign-up"
              >
                {t("landingpage.cta.postEvent")}
              </Link>
              <span className="text-white text-sm">
                {t("landingpage.cta.trial")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
