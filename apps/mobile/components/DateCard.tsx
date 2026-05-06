import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { format, parseISO } from "date-fns";
import React from "react";
import { View } from "react-native";

interface DateCardProps {
  dateString: string;
}

export const DateCard = ({ dateString }: DateCardProps) => {
  const theme = useAppTheme();
  const date = parseISO(dateString);
  const dayName = format(date, "EEEE");
  const monthDay = format(date, "MMM d");
  const time = format(date, "HH:mm");

  return (
    <View
      className="items-center justify-center rounded-lg"
      style={{
        padding: 16,
        width: 96,
        minHeight: 128,
        borderWidth: 1,
        borderColor: theme.gray3,
        backgroundColor: theme.backgroundStrong,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "500",
          color: theme.gray6,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {dayName}
      </Text>
      <Text
        style={{
          textAlign: "center",
          fontSize: 20,
          fontWeight: "700",
          color: theme.gray12,
          marginTop: 8,
        }}
      >
        {monthDay}
      </Text>
      <Text
        style={{
          fontSize: 18,
          color: theme.gray6,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        {time}
      </Text>
    </View>
  );
};
