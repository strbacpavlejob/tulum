import React from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Info } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type MatchesLocationGateCardProps = {
  topInset: number;
  onBypass: () => void;
};

export default function MatchesLocationGateCard({
  topInset,
  onBypass,
}: MatchesLocationGateCardProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  const showBypassButton =
    (process.env.EXPO_ENVIROMENT ?? "").toLowerCase() === "local";

  return (
    <View
      className="rounded-[20px] bg-light-backgroundStrong p-4 dark:bg-dark-backgroundStrong"
      style={{
        position: "absolute",
        top: topInset + 16,
        left: 16,
        right: 16,
        zIndex: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View className="flex-row items-start gap-3">
        {/* Info icon */}
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: `${theme.colorStrong}15`,
          }}
        >
          <Info size={18} color={theme.colorStrong} />
        </View>

        {/* Info content */}
        <View className="flex-1">
          <Text className="text-[16px] font-bold leading-[22px] text-light-colorInverse dark:text-dark-colorStrong">
            {t("matchesAlmostThere")}
          </Text>

          <Text className="mt-1 text-[12px] leading-[18px] text-light-gray10 dark:text-dark-gray10">
            {t("matchesArriveAtVenue")}
          </Text>
        </View>
      </View>

      {showBypassButton && (
        <View className="mt-4 pl-12">
          <Button
            variant="outline"
            onPress={onBypass}
            className="self-start h-9 rounded-full px-4"
            style={{
              borderColor: theme.border,
              borderRadius: 999,
              backgroundColor: theme.backgroundStrong,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: theme.colorStrong,
              }}
            >
              Show matches anyway
            </Text>
          </Button>
        </View>
      )}
    </View>
  );
}
