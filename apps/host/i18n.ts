import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const supportedLanguages = ["en", "sr", "ru"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: require("./locales/en/common.json"),
      },
      sr: {
        translation: require("./locales/sr/common.json"),
      },
      ru: {
        translation: require("./locales/ru/common.json"),
      },
    },
    supportedLngs: supportedLanguages,
    fallbackLng: "en",
    detection: {
      order: ["navigator", "localStorage", "htmlTag"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
