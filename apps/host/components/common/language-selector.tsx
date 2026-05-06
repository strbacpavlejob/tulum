"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/store";

const languages = [
  {
    code: "sr",
    label: "Srpski",
    flagUrl: "https://hatscripts.github.io/circle-flags/flags/rs.svg",
  },
  {
    code: "en",
    label: "English",
    flagUrl: "https://hatscripts.github.io/circle-flags/flags/gb.svg",
  },
  {
    code: "ru",
    label: "Русский",
    flagUrl: "https://hatscripts.github.io/circle-flags/flags/ru.svg",
  },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();
  const setLanguage = usePreferencesStore((state) => state.setLanguage);

  // Sync store language with i18n on mount
  useEffect(() => {
    // Read language from store after hydration
    const storedLanguage = usePreferencesStore.getState().language;

    if (storedLanguage) {
      i18n.changeLanguage(storedLanguage);
    } else {
      // Detect and set language on first mount
      const browserLang = navigator.language.split("-")[0];
      const supportedLangs = ["en", "sr", "ru"];
      const langToSet = supportedLangs.includes(browserLang)
        ? browserLang
        : "en";
      i18n.changeLanguage(langToSet);
      setLanguage(langToSet as "en" | "sr" | "ru");
    }
  }, [i18n, setLanguage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setLanguage(lang as "en" | "sr" | "ru");
    document.documentElement.setAttribute("lang", lang);
    setIsOpen(false);
  };

  const currentLang =
    languages.find((lang) => lang.code === i18n.language) ||
    languages.find((lang) => lang.code === "en");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all duration-200 hover:scale-110 overflow-hidden p-1"
        aria-label="Select language"
      >
        {currentLang?.flagUrl && (
          <Image
            src={currentLang.flagUrl}
            alt={currentLang.label}
            width={32}
            height={32}
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-10 right-0 bg-background border border-border rounded-lg shadow-lg py-2 min-w-35 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3 ${
                i18n.language === lang.code
                  ? "bg-primary/10 text font-semibold"
                  : "text-foreground"
              }`}
            >
              <Image
                src={lang.flagUrl}
                alt={lang.label}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-sm">{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
