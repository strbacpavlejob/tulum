import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { format, parseISO } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import React from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

interface DateCardProps {
  dateString: string;
}

export const DateCard = ({ dateString }: DateCardProps) => {
  const theme = useAppTheme();
  const { i18n } = useTranslation();

  const getDateLocale = () => {
    switch (i18n.language) {
      case "RU":
        return ru;
      case "RS":
        return srLatn;
      default:
        return enUS;
    }
  };

  const dateLocale = getDateLocale();
  const date = parseISO(dateString);
  const dayName = format(date, "EEEE", { locale: dateLocale });
  const monthDay = format(date, "MMM d", { locale: dateLocale });
  const time = format(date, "HH:mm");

  return (
    <View
      className={`flex flex-col gap-2 items-center justify-center rounded-lg border p-4 w-24 min-h-[128px] `}
      style={{
        borderColor: theme.gray3,
        backgroundColor: theme.backgroundStrong,
      }}
    >
      <Text
        className={`flex uppercase font-medium text-center text-sm`}
        style={{ color: theme.gray12 }}
      >
        {monthDay}
      </Text>
      <Text
        className={`mt-2 w-full text-center text-md font-semibold uppercase `}
        style={{ color: theme.gray12 }}
      >
        {dayName}
      </Text>
      <Text
        className={`uppercase font-medium text-center text-sm `}
        style={{ color: theme.gray12 }}
      >
        {time}
      </Text>
    </View>
  );
};
