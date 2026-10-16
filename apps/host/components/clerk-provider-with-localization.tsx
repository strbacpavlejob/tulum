"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { enUS, srRS, ruRU } from "@clerk/localizations";
import { useSyncExternalStore } from "react";
import i18n from "../i18n";

function subscribeToLanguageChange(onChange: () => void) {
  i18n.on("languageChanged", onChange);
  return () => i18n.off("languageChanged", onChange);
}

function getLanguageSnapshot() {
  return i18n.language || "en";
}

function getServerLanguageSnapshot() {
  return "en";
}

export function ClerkProviderWithLocalization({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentLanguage = useSyncExternalStore(
    subscribeToLanguageChange,
    getLanguageSnapshot,
    getServerLanguageSnapshot,
  );

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
