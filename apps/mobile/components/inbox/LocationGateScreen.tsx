import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TouchableOpacity, View } from "react-native";
import { MatchLocationMap } from "@/components/MatchLocationMap";
import { Text } from "@/components/ui/text";

/** Metres within which the user is considered "at the venue" for chat access */
export const PROXIMITY_RADIUS_M = 300;

/** How often (ms) to re-check position on the location verification screen */
export const LOCATION_POLL_INTERVAL_MS = 5_000;

export function LocationGateScreen({
  venueLat,
  venueLng,
  userLat,
  userLng,
  venueName,
  onCheckLocation,
  onBack,
}: {
  venueLat: number;
  venueLng: number;
  userLat?: number;
  userLng?: number;
  venueName: string;
  onCheckLocation: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {/* Full-screen map */}
      <MatchLocationMap
        venueLat={venueLat}
        venueLng={venueLng}
        userLat={userLat}
        userLng={userLng}
      />

      {/* Overlay card */}
      <View
        className="gap-2 rounded-[20px] bg-light-backgroundStrong p-5 dark:bg-dark-backgroundStrong"
        style={{
          position: "absolute",
          top: insets.top + 16,
          left: 16,
          right: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text className="text-[18px] font-bold leading-[26px] text-light-color dark:text-dark-color">
          {t("chatLocationRequired")}
        </Text>
        <Text className="text-[13px] leading-5 text-light-gray10 dark:text-dark-gray10">
          {t("chatLocationRequiredSubtitle")}
        </Text>
        <View className="mt-1 flex-row flex-wrap gap-2">
          <TouchableOpacity
            onPress={onCheckLocation}
            className="rounded-full bg-light-color px-5 py-2.5 dark:bg-dark-color"
          >
            <Text className="text-[13px] font-semibold text-light-background dark:text-dark-background">
              {t("matchesCheckLocation")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onBack}
            className="rounded-full bg-light-gray3 px-5 py-2.5 dark:bg-dark-gray3"
          >
            <Text className="text-[13px] font-semibold text-light-gray10 dark:text-dark-gray10">
              {t("back")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Legend */}
      <View
        className="flex-row gap-4 rounded-[14px] bg-light-backgroundStrong p-[14px] dark:bg-dark-backgroundStrong"
        style={{
          position: "absolute",
          bottom: insets.bottom + 24,
          left: 16,
          right: 16,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#3b82f6",
              borderWidth: 2,
              borderColor: "white",
            }}
          />
          <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
            {t("matchesYourLocation")}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-light-color dark:bg-dark-color" />
          <Text className="text-xs text-light-gray10 dark:text-dark-gray10">
            {venueName || t("matchesEventVenue")}
          </Text>
        </View>
      </View>
    </View>
  );
}
