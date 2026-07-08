import i18n from "@/lib/i18n";
import useStore from "@/store/useStore";
import type { Settings } from "@/types/settings";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

type AppLanguage = Settings["language"];

const LANGUAGE_OPTIONS: {
  code: AppLanguage;
  label: string;
  shortLabel: string;
  flagUrl: string;
}[] = [
  {
    code: "RS",
    label: "Srpski",
    shortLabel: "SR",
    flagUrl: "https://hatscripts.github.io/circle-flags/flags/rs.svg",
  },
  {
    code: "EN",
    label: "English",
    shortLabel: "EN",
    flagUrl: "https://hatscripts.github.io/circle-flags/flags/gb.svg",
  },
  {
    code: "RU",
    label: "Русский",
    shortLabel: "RU",
    flagUrl: "https://hatscripts.github.io/circle-flags/flags/ru.svg",
  },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useAppTheme();
  const settings = useStore((state) => state.settings);
  const setSettings = useStore((state) => state.setSettings);

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    if (settings.language === nextLanguage) return;

    setSettings({ ...settings, language: nextLanguage });

    if (i18n.language !== nextLanguage) {
      i18n.changeLanguage(nextLanguage);
    }

    setIsOpen(false);
  };

  const currentLanguage =
    LANGUAGE_OPTIONS.find((option) => option.code === settings.language) ||
    LANGUAGE_OPTIONS.find((option) => option.code === "EN");

  return (
    <View style={{ position: "relative" }}>
      {isOpen && (
        <Pressable
          onPress={() => setIsOpen(false)}
          style={{
            position: "absolute",
            top: -2000,
            left: -2000,
            right: -2000,
            bottom: -2000,
          }}
        />
      )}

      <Pressable
        onPress={() => setIsOpen((prev) => !prev)}
        className="w-9 h-9 rounded-full items-center justify-center overflow-hidden p-1"
        style={{
          backgroundColor: theme.color025,
          borderWidth: 1,
          borderColor: theme.border,
        }}
        accessibilityRole="button"
        accessibilityLabel="Select language"
      >
        {currentLanguage?.flagUrl ? (
          <Image
            source={{ uri: currentLanguage.flagUrl }}
            style={{ width: 32, height: 32, borderRadius: 999 }}
            contentFit="cover"
          />
        ) : (
          <Text style={{ color: theme.colorStrong, fontWeight: "700" }}>
            {currentLanguage?.shortLabel}
          </Text>
        )}
      </Pressable>

      {isOpen && (
        <View
          className="rounded-xl py-1"
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            minWidth: 164,
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
            zIndex: 100,
          }}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = settings.language === option.code;

            return (
              <Pressable
                key={option.code}
                onPress={() => handleLanguageChange(option.code)}
                className="flex-row items-center gap-3 px-3 py-2"
                style={{
                  backgroundColor: isActive ? theme.color025 : "transparent",
                }}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${option.label}`}
              >
                <Image
                  source={{ uri: option.flagUrl }}
                  style={{ width: 24, height: 24, borderRadius: 999 }}
                  contentFit="cover"
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "500",
                    color: theme.colorStrong,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
