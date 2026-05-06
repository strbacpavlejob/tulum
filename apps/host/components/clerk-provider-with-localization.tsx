"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { enUS, srRS, ruRU } from "@clerk/localizations";
import { useEffect, useState } from "react";
import i18n from "../i18n";

export function ClerkProviderWithLocalization({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  const clerkLocalization = (() => {
    const languageMap = {
      en: enUS,
      sr: srRS,
      ru: ruRU,
    };
    return languageMap[currentLanguage as keyof typeof languageMap] || enUS;
  })();

  return (
    <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
  );
}
