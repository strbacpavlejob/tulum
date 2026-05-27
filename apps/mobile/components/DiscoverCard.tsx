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
import { Pressable, View, StyleProp, ViewStyle } from "react-native";

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
      <View
        style={{
          flex: 1,
          justifyContent: "space-between",
          padding: 10,
          paddingRight: 38,
        }}
      >
        {/* Top info */}
        <View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 14, fontWeight: "600", color: theme.gray12 }}
          >
            {event.title}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 12, color: theme.gray10, marginTop: 1 }}
          >
            {event.location.address ?? ""}
          </Text>
          <Text style={{ fontSize: 11, color: theme.gray10, marginTop: 1 }}>
            {dateLabel} · {goingCount} {t("going")}
          </Text>

          {/* Tags */}
          <View className="flex-row flex-wrap ">
            <Tags tags={event.tags} size="ssm" />
          </View>
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
