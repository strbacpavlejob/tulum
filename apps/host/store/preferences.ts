import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "sr" | "ru";
export type Theme = "light" | "dark" | "system";

interface PreferencesState {
  language: Language;
  theme: Theme;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
}

// Helper to get initial language from i18next localStorage first
const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";
  
  // Check i18next's localStorage key first
  const i18nextLng = localStorage.getItem("i18nextLng");
  if (i18nextLng && ["en", "sr", "ru"].includes(i18nextLng)) {
    return i18nextLng as Language;
  }
  
  return "en";
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: getInitialLanguage(),
      theme: "system",
      setLanguage: (language) => {
        // Sync with i18next localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("i18nextLng", language);
        }
        set({ language });
      },
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "tulum-preferences",
    },
  ),
);
