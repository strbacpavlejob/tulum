import SettingsRow from "@/components/SettingsRow";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { VenueType } from "@/types/filter";
import { Settings } from "@/types/settings";
import {
  Bell,
  Bug,
  Globe,
  LogOut,
  MapPin,
  MapPinPlus,
  Sun,
  Trash2,
} from "lucide-react-native";
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

type VenueOption = {
  name: string;
  value: VenueType;
};

type SettingsTabProps = {
  settings: Settings;
  venueOptions: VenueOption[];

  locationName?: string;

  onThemePress: () => void;
  onLanguagePress: () => void;
  onVenueTypePress: () => void;
  onReportBugPress: () => void;
  onSuggestVenuePress: () => void;
  onDeleteAccountPress: () => void;

  onNotificationsChange: (enabled: boolean) => void;
  onLogout: () => void | Promise<void>;
};

export default function SettingsTab({
  settings,
  venueOptions,
  locationName = "Belgrade",
  onThemePress,
  onLanguagePress,
  onVenueTypePress,
  onReportBugPress,
  onSuggestVenuePress,
  onDeleteAccountPress,
  onNotificationsChange,
  onLogout,
}: SettingsTabProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const selectedVenueName = t(
    venueOptions.find((venue) => venue.value === settings.defaultVenueType)
      ?.name ?? "notSet",
  );

  const languageName = getLanguageName(settings.language, t);

  return (
    <TabsContent value="settings" className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-2">
          <SettingsRow
            icon={Sun}
            title={t("theme")}
            subtitle={t(settings.theme.toLowerCase() as never)}
            onPress={onThemePress}
          />

          <Separator />

          <SettingsRow
            icon={Bell}
            title={t("notifications")}
            subtitle={settings.notificationsEnabled ? t("on") : t("off")}
            right={
              <Switch
                checked={settings.notificationsEnabled}
                onCheckedChange={onNotificationsChange}
              />
            }
          />

          <Separator />

          <SettingsRow
            icon={Globe}
            title={t("language")}
            subtitle={languageName}
            onPress={onLanguagePress}
          />

          <Separator />

          <SettingsRow
            icon={MapPin}
            title={t("location")}
            subtitle={locationName}
          />

          <Separator />

          <SettingsRow
            icon={MapPin}
            title={t("defaultVenueType")}
            subtitle={selectedVenueName}
            onPress={onVenueTypePress}
          />

          <Separator />

          <SettingsRow
            icon={Bug}
            title={t("reportBug")}
            onPress={onReportBugPress}
          />

          <Separator />

          <SettingsRow
            icon={MapPinPlus}
            title={t("suggestVenue")}
            onPress={onSuggestVenuePress}
          />
        </View>

        <View className="mx-4 mt-6 gap-3">
          <Button
            variant="outline"
            onPress={() => {
              void onLogout();
            }}
            className="w-full gap-2"
            style={{
              borderColor: theme.border,
            }}
          >
            <LogOut size={18} color={theme.colorStrong} />

            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: theme.colorStrong,
              }}
            >
              {t("logOut")}
            </Text>
          </Button>

          <Button
            variant="outline"
            onPress={onDeleteAccountPress}
            className="w-full gap-2"
            style={{
              borderColor: theme.destructive,
            }}
          >
            <Trash2 size={18} color={theme.destructive} />

            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: theme.destructive,
              }}
            >
              {t("deleteAccount")}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </TabsContent>
  );
}

function getLanguageName(
  language: Settings["language"],
  t: (key: string) => string,
) {
  switch (language) {
    case "EN":
      return t("english");

    case "RS":
      return t("serbian");

    case "RU":
      return t("russian");

    default:
      return language;
  }
}
