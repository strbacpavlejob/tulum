import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
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
  const theme = useAppTheme();
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
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.background,
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
          <X size={28} color={theme.gray12} />
        </Pressable>

        {/* Header */}
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text
            style={{
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: theme.gray12,
              marginBottom: 8,
            }}
          >
            {t("findYourMatch")}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: theme.gray12,
              opacity: 0.7,
            }}
          >
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
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: theme.gray12,
              opacity: 0.3,
              marginTop: 8,
            }}
          />
        </View>

        {/* Bottom description */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 14,
            color: theme.gray12,
            opacity: 0.7,
            lineHeight: 22,
          }}
        >
          {t("pairCodeDescription")}
        </Text>
      </View>
    </View>
  );
}
