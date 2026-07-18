import { Text } from "@/components/ui/text";
import { faker } from "@faker-js/faker";
import { X } from "lucide-react-native";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMOJIS = ["🍒", "🔥", "🌙", "⚡️", "🍸", "🎧", "💫", "🖤", "🪩", "🍑"];

type FindModalProps = {
  onClose: () => void;
};

export default function FindModal({ onClose }: FindModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const { emoji, bgColor } = useMemo(
    () => ({
      emoji: faker.helpers.arrayElement(EMOJIS),
      bgColor: faker.color.rgb(),
    }),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Overlay */}
      <View
        className="bg-light-background dark:bg-dark-background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.7,
        }}
      />

      {/* Content */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={{ alignSelf: "flex-end" }}
          accessibilityLabel="Close"
        >
          <X size={28} color="#0a0a0a" />
        </Pressable>

        {/* Header */}
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text className="mb-2 text-[20px] uppercase tracking-[4px] text-light-gray12 dark:text-dark-gray12">
            {t("findYourMatch")}
          </Text>
          <Text className="text-[18px] font-semibold text-light-gray12 opacity-70 dark:text-dark-gray12">
            {t("pairCode")}: #{faker.string.alphanumeric(6).toUpperCase()}
          </Text>
        </View>

        {/* Center emoji */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 200 }}>{emoji}</Text>
          <View className="mt-2 h-3 w-3 rounded-full bg-light-gray12 opacity-30 dark:bg-dark-gray12" />
        </View>

        {/* Bottom description */}
        <Text className="text-center text-sm leading-[22px] text-light-gray12 opacity-70 dark:text-dark-gray12">
          {t("pairCodeDescription")}
        </Text>
      </View>
    </View>
  );
}
