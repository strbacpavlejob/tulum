import { Text } from "@/components/ui/text";
import { format } from "date-fns";
import { Calendar, Clock, Users } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

interface InfoSectionProps {
  date: Date;
  capacity: number;
}

export const InfoSection = ({ date, capacity }: InfoSectionProps) => {
  return (
    <View className="flex-row gap-2 items-center">
      {/* Time */}
      <View className="flex-row items-center gap-1">
        <Clock size={16} color="#6b7280" />
        <Text className="text-sm text-gray-500">{format(date, "hh:mm")}</Text>
      </View>
      {/* Date */}
      <View className="flex-row items-center gap-1">
        <Calendar size={16} color="#6b7280" />
        <Text className="text-sm text-gray-500">
          {format(date, "iii - MMM d ")}
        </Text>
      </View>
      {/* Capacity */}
      <View className="flex-row items-center gap-1">
        <Users size={16} color="#6b7280" />
        <Text className="text-sm text-gray-500">{capacity}</Text>
      </View>
    </View>
  );
};
