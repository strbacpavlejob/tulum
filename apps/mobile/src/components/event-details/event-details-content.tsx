import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react-native";
import { DateCard } from "@/components/date-card";
import { MiniMap } from "@/components/mini-map";
import { AvatarList } from "@/components/avatar-list";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { Event } from "@/types/event";
import type { EventAttendee } from "@/lib/api";

interface EventDetailsContentProps {
  event: Event;
  openGuestList: () => void;
  goingCount: number;
  maxSpots: number;
  guestList: EventAttendee[];
  progressValue: number;
  freeSpots: number;
}

export function EventDetailsContent({
  event,
  openGuestList,
  goingCount,
  maxSpots,
  guestList,
  progressValue,
  freeSpots,
}: EventDetailsContentProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const { t } = useTranslation();
  const theme = useAppTheme();
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Description + Date */}
      <View className="flex-row items-start gap-4">
        <View className="flex-1">
          <Pressable onPress={() => setDescExpanded((v) => !v)}>
            <View>
              <Text
                className="text-sm leading-[22px] text-light-gray6 dark:text-dark-gray6"
                numberOfLines={descExpanded ? undefined : 3}
              >
                {event.description}
              </Text>
              <View className="flex-row items-center justify-center mt-2">
                {descExpanded ? (
                  <ChevronUp size={14} color={theme.gray5} />
                ) : (
                  <ChevronDown size={14} color={theme.gray5} />
                )}
              </View>
            </View>
          </Pressable>
        </View>
        <View className="shrink-0">
          <DateCard dateString={event.date} />
        </View>
      </View>

      {/* Map */}
      <View
        className="w-full overflow-hidden rounded-2xl border border-light-gray3 bg-light-backgroundStrong dark:border-dark-gray3 dark:bg-dark-backgroundStrong"
        style={{
          height: 160,
        }}
      >
        <MiniMap
          latitude={event.location.latitude}
          longitude={event.location.longitude}
          address={event.location.address}
          height={160}
        />
      </View>

      {/* Address */}
      <View className="flex-row items-center gap-2">
        <MapPin size={16} color={theme.gray12} />
        <Text className="text-sm text-light-gray6 dark:text-dark-gray6">
          {`${event.venueName}, ${event.location.address}`}
        </Text>
      </View>

      {/* Guests */}
      <Pressable onPress={openGuestList}>
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-light-gray5 dark:text-dark-gray5">
              {t("goingLabel")}
            </Text>
            <Text className="text-xs text-light-gray5 dark:text-dark-gray5">
              {goingCount}/{maxSpots}
            </Text>
          </View>

          <View className="mb-3">
            <AvatarList
              avatars={guestList}
              hiddenCount={Math.max(0, goingCount - guestList.length)}
            />
          </View>

          {/* Progress bar */}
          <View className="h-1.5 w-full overflow-hidden rounded-full bg-light-gray3 dark:bg-dark-gray3">
            <View
              style={{
                width: `${progressValue}%`,
                height: "100%",
                backgroundColor: theme.color,
              }}
            />
          </View>

          <Text className="mt-1 text-xs text-light-gray5 dark:text-dark-gray5">
            {freeSpots > 0
              ? t("spotsLeft", { count: freeSpots })
              : t("eventIsFull")}
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}
