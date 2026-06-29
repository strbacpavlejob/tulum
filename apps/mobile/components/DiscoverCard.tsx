import FavoriteButton from "@/components/FavoriteButton";
import Tags from "@/components/Tags";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { EventSummary } from "@/types/event";
import { format } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";

interface DiscoverCardProps {
  event: EventSummary;
  isSelected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const DiscoverCard = ({
  event,
  isSelected,
  onPress,
  style,
}: DiscoverCardProps) => {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

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

  const timeFormat = i18n.language === "EN" ? "EEEE · haa" : "EEEE · HH:mm";
  const dateLabel = format(new Date(event.date), timeFormat, {
    locale: getDateLocale(),
  });

  const goingCount = event.guestCount ?? 0;
  const goingLabel =
    goingCount === 0 ? t("beTheFirst") : `${goingCount} ${t("going")}`;

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          height: 112,
          width: 300,
          flexDirection: "row",
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: theme.background075,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? theme.color : theme.gray4,
        },
        style,
      ]}
    >
      {/* Image */}
      <View style={{ width: 100, height: "100%" }}>
        <Image
          source={{ uri: event.image }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="disk"
        />
      </View>

      {/* Content */}

      <View className="flex-1 justify-center gap-1 p-2 mt-4">
        <View className="flex-row ">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 14, fontWeight: "600", color: theme.gray12 }}
          >
            {event.title}
          </Text>
        </View>
        <View className="flex-row flex-wrap">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 12, color: theme.gray10 }}
          >
            {event.venueName ?? ""}
          </Text>
          <Text style={{ fontSize: 11, color: theme.gray10 }}>
            {dateLabel} · {goingLabel}
          </Text>
        </View>

        {/* Tags */}
        <View className="flex-row flex-wrap" style={{ overflow: "hidden" }}>
          <Tags tags={event.tags} size="ssm" />
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
          eventId={event.id}
          size={16}
        />
      </View>
    </Pressable>
  );
};
