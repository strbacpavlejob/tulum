import { format, parseISO } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";

  // Get date-fns locale based on current language
  export const getDateLocale = (language: string) => {
    switch (language) {
      case "ru":
        return ru;
      case "sr":
        return srLatn;
      default:
        return enUS;
    }
  };

  export const formatDate = (dateString: string, language: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "PPP", { locale: getDateLocale(language) });
    } catch {
      return dateString;
    }
  };

  export const formatTime = (dateString: string, language: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "HH:mm", { locale: getDateLocale(language) });
    } catch {
      return dateString;
    }
  };