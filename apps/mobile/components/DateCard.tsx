import { Text } from "@/components/ui/text";
import { format, parseISO } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import React from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

interface DateCardProps {
  dateString: string;
}

export const DateCard = ({ dateString }: DateCardProps) => {
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
    <View className="flex min-h-[128px] w-24 flex-col items-center justify-center gap-2 rounded-lg border border-light-gray3 bg-light-backgroundStrong p-4 dark:border-dark-gray3 dark:bg-dark-backgroundStrong">
      <Text className="flex text-center text-sm font-medium uppercase text-light-gray12 dark:text-dark-gray12">
        {monthDay}
      </Text>
      <Text className="mt-2 w-full text-center text-md font-semibold uppercase text-light-gray12 dark:text-dark-gray12">
        {dayName}
      </Text>
      <Text className="text-center text-sm font-medium uppercase text-light-gray12 dark:text-dark-gray12">
        {time}
      </Text>
    </View>
  );
};
