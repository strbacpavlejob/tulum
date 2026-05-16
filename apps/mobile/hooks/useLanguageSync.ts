import i18n from "@/lib/i18n";
import useStore from "@/store/useStore";
import { useEffect } from "react";

/**
 * Watches settings.language in the Zustand store and keeps i18next in sync.
 * Call this once at the root layout.
 */
export function useLanguageSync() {
  const language = useStore((s) => s.settings.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);
}
