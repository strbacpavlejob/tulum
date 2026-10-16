"use client";

import { useTranslation } from "react-i18next";
import "../../i18n";
import Navbar from "@/components/sections/Navbar";
import MapSection from "@/components/sections/MapSection";
import FeatureHighlight from "@/components/sections/FeatureHighlight";
import Footer from "@/components/sections/Footer";
import HeroGuest from "@/components/sections/HeroGuest";
import PricingGuest from "@/components/sections/PricingGuest";
import FAQGuest from "@/components/sections/FAQGuest";
import CTAGuest from "@/components/sections/CTAGuest";

export default function TulumLanding() {
  const { t } = useTranslation();
  const mobileUrl = process.env.NEXT_PUBLIC_TULUM_MOBILE_URL;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto border-x relative">
        {/* Vertical border lines */}
        <div className="block w-px h-full border-l border-border absolute top-0 left-6 z-10"></div>
        <div className="block w-px h-full border-r border-border absolute top-0 right-6 z-10"></div>

        <Navbar
          scrollToSection={scrollToSection}
          cta={
            mobileUrl
              ? { label: t("landingpage.nav.login"), href: mobileUrl }
              : null
          }
        />

        <main className="flex flex-col items-center justify-center divide-y divide-border min-h-screen w-full">
          <HeroGuest />
          <MapSection />
          <FeatureHighlight />
          <PricingGuest />
          <FAQGuest />
          <CTAGuest />
        </main>

        <Footer />
      </div>
    </div>
  );
}
