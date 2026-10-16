import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import srCommon from "./locales/sr/common.json";
import ruCommon from "./locales/ru/common.json";

const supportedLanguages = ["en", "sr", "ru"];

i18n
  .use(initReactI18next)
  .init({
    lng: "en",
    resources: {
      en: {
        translation: enCommon,
      },
      sr: {
        translation: srCommon,
      },
      ru: {
        translation: ruCommon,
      },
    },
    supportedLngs: supportedLanguages,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
