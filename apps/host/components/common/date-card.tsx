"use client";

import { format, parseISO } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import "../../i18n";

interface DateCardProps {
  dateString: string;
}

export function DateCard({ dateString }: DateCardProps) {
  const { i18n } = useTranslation();

  // Get date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case "ru":
        return ru;
      case "sr":
        return srLatn;
      default:
        return enUS;
    }
  };

  const date = parseISO(dateString);
  const dayName = format(date, "EEEE", { locale: getDateLocale() });
  const monthDay = format(date, "MMM d", { locale: getDateLocale() });
  const time = format(date, "HH:mm");

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-border bg-foreground/5  text-card-foreground shadow-sm w-24 min-h-32 text-center">
      <div className="text-xs font-medium text-muted-foreground uppercase">
        {dayName}
      </div>
      <div className="text-xl font-bold mt-2">{monthDay}</div>
      <div className="text-lg text-muted-foreground mt-2">{time}</div>
    </div>
  );
}
