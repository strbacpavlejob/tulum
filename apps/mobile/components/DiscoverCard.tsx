import FavoriteButton from "@/components/FavoriteButton";
import Tags from "@/components/Tags";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { EventSummary } from "@/types/event";
import { format } from "date-fns";
import { enUS, ru, srLatn } from "date-fns/locale";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Pressable, StyleProp, View, ViewStyle } from "react-native";
import { Marquee } from "./ui/marquee";
import { Skeleton } from "./ui/skeleton";
import { TagsMarquee } from "./ui/tags-marquee";

interface DiscoverCardProps {
  event?: EventSummary;
  isSelected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  isLoading?: boolean;
}

export const DiscoverCard = ({
  event,
  isSelected = false,
  onPress,
  style,
  isLoading = false,
}: DiscoverCardProps) => {
  const { t, i18n } = useTranslation();

  if (isLoading) {
    return (
      <View
        className="h-28 w-[300px] flex-row overflow-hidden rounded-2xl border border-light-gray4 bg-light-background075 dark:border-dark-gray4 dark:bg-dark-background075"
        style={style}
      >
        <Skeleton className="h-full w-[100px] rounded-none" />

        <View className="flex-1 justify-between p-2">
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-3 w-[60%]" />
          <Skeleton className="h-3 w-[75%]" />
          <Skeleton className="h-4 w-[90%]" />
        </View>

        <View className="absolute top-3 right-3 w-8 h-8 rounded-full overflow-hidden">
          <Skeleton className="h-full w-full rounded-full" />
        </View>
      </View>
    );
  }

  if (!event) return null;

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
      className={cn(
        "h-28 w-[300px] flex-row overflow-hidden rounded-2xl bg-light-background075 dark:bg-dark-background075",
        isSelected
          ? "border-2 border-light-color dark:border-dark-color"
          : "border border-light-gray4 dark:border-dark-gray4",
      )}
      style={style}
    >
      <View className="h-full w-[100px]">
        <Image
          source={{ uri: event.image }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="disk"
        />
      </View>

      <View className="flex-1 justify-between gap-1 overflow-hidden p-2">
        <Marquee active={isSelected}>
          <Text
            numberOfLines={1}
            className="shrink-0 text-sm font-bold text-light-gray12 dark:text-dark-gray12"
          >
            {event.title}
          </Text>
        </Marquee>

        <View className="flex-row">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-xs font-normal text-light-gray10 dark:text-dark-gray10"
          >
            {event.venueName ?? ""}
          </Text>
        </View>

        <View className="flex-row flex-wrap">
          <Text className="text-xs font-normal text-light-gray10 dark:text-dark-gray10">
            {dateLabel} · {goingLabel}
          </Text>
        </View>

        <View className="flex-row shrink-0">
          <TagsMarquee active={isSelected}>
            <Tags tags={event.tags} size="ssm" />
          </TagsMarquee>
        </View>
      </View>

      <View
        className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-light-background075 dark:bg-dark-background075"
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
