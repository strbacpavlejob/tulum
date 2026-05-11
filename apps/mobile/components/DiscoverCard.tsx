import FavoriteButton from "@/components/FavoriteButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Event } from "@/types/event";
import { useAuth } from "@clerk/expo";
import { format } from "date-fns";
import React from "react";
import { Pressable, Image, View } from "react-native";

interface DiscoverCardProps {
  event: Event;
  isSelected: boolean;
  onPress: () => void;
}

export const DiscoverCard = ({
  event,
  isSelected,
  onPress,
}: DiscoverCardProps) => {
  const theme = useAppTheme();
  const { userId } = useAuth();
  const dateLabel = format(new Date(event.date), "EEE · haa");
  const goingCount = event.guests?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 96,
        minWidth: 300,
        flexDirection: "row",
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: theme.background075,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? theme.color : theme.gray4,
      }}
    >
      {/* Image */}
      <View style={{ width: "33%", height: "100%" }}>
        <Image
          source={{ uri: event.image }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <View className="flex-1 justify-between p-3 pr-10">
        {/* Top info */}
        <View>
          <Text
            style={{ fontSize: 14, fontWeight: "600", color: theme.gray12 }}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text
            style={{ fontSize: 12, color: theme.gray10, marginTop: 1 }}
            numberOfLines={1}
          >
            {event.location.address ?? ""}
          </Text>
          <Text style={{ fontSize: 11, color: theme.gray10, marginTop: 4 }}>
            {dateLabel} · {goingCount} going
          </Text>
        </View>

        {/* Tags */}
        <View className="flex-row flex-wrap gap-1.5">
          {event.tags.slice(0, 3).map((tag) => (
            <View
              key={tag}
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: theme.gray3 }}
            >
              <Text style={{ fontSize: 10, color: theme.gray10 }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Heart — View captures touch to prevent bubbling to card Pressable */}
      <View
        className="absolute top-3 right-3 w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: theme.background075 }}
        onStartShouldSetResponder={() => true}
      >
        <FavoriteButton
          isFavorite={event.isFavorite}
          userId={userId ?? undefined}
          eventId={event.id}
          size={16}
        />
      </View>
    </Pressable>
  );
};
