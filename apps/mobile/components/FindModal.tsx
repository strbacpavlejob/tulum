import { Text } from "@/components/ui/text";
import { EMOJIS } from "@/constants/options";
import { faker } from "@faker-js/faker";
import { X } from "lucide-react-native";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FindModalProps = {
  onClose: () => void;
  matchId?: string;
};

export default function FindModal({ onClose, matchId }: FindModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Stable hash function (djb2 variant) to map an id -> number
  const hashString = (str: string) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  };

  // Convert HSL to hex color string
  const hslToHex = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Derive deterministic emoji + background color from `matchId` so both
  // matched users get the same representation. Fall back to faker when
  // no matchId provided (keeps existing behavior for callers that don't pass it).
  const { emoji, bgColor } = useMemo(() => {
    if (matchId) {
      const h = hashString(matchId);
      const emojiIndex = h % EMOJIS.length;
      const hue = h % 360;
      const color = hslToHex(hue, 70, 50);
      return { emoji: EMOJIS[emojiIndex], bgColor: color };
    }

    return {
      emoji: faker.helpers.arrayElement(EMOJIS),
      bgColor: faker.color.rgb(),
    };
  }, [matchId]);

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
        </View>

        {/* Bottom description */}
        <Text className="text-center text-sm leading-[22px] text-light-gray12 opacity-70 dark:text-dark-gray12">
          {t("pairCodeDescription")}
        </Text>
      </View>
    </View>
  );
}
