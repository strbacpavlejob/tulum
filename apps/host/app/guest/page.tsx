"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../../i18n";
import Navbar from "@/components/sections/Navbar";
import MapSection from "@/components/sections/MapSection";
import FeatureHighlight from "@/components/sections/FeatureHighlight";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";
import HeroGuest from "@/components/sections/HeroGuest";
import PricingGuest from "@/components/sections/PricingGuest";
import FAQGuest from "@/components/sections/FAQGuest";
import Testimonials from "@/components/sections/Testimonials";
import CTAGuest from "@/components/sections/CTAGuest";

export default function TulumLanding() {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Detect and set language on mount
    const browserLang = navigator.language.split("-")[0];
    const supportedLangs = ["en", "sr", "ru"];

    if (!localStorage.getItem("i18nextLng")) {
      const langToSet = supportedLangs.includes(browserLang)
        ? browserLang
        : "en";
      i18n.changeLanguage(langToSet);
    }
    setMounted(true);
  }, [i18n]);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (!mounted) {
    return null;
  }

  const mobileUrl = process.env.NEXT_PUBLIC_TULUM_MOBILE_URL ?? "#";

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
          cta={{ label: t("landingpage.nav.login"), href: mobileUrl }}
        />

        <main className="flex flex-col items-center justify-center divide-y divide-border min-h-screen w-full">
          <HeroGuest />
          <MapSection />
          <FeatureHighlight />
          {/* <BentoBenefits /> */}
          {/* <Problem /> */}
          {/* <HowItWorks /> */}
          <Testimonials />
          <PricingGuest />
          <FAQGuest />
          <CTAGuest />
        </main>

        <Footer />
      </div>
    </div>
  );
}
