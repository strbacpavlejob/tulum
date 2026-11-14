import ProfileInfoView, {
  type ProfileInfoEditCallbacks,
  type ProfileInfoField,
} from "@/components/ProfileInfoView";
import SettingsRow from "@/components/SettingsRow";
import { TabsContent } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { visibilityOptions } from "@/constants/options";
import { User } from "@/types/user";
import { BookOpen, Eye, EyeOff, Heart, Tag } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ProfileEditCallbacks = ProfileInfoEditCallbacks;

type ProfileTabProps = {
  user: User;
  profileFields: ProfileInfoField[];
  editCallbacks: ProfileEditCallbacks;
  /** Opens the "Who can see me" choice. */
  onVisibilityPress: () => void;
};

export default function ProfileTab({
  user,
  profileFields,
  editCallbacks,
  onVisibilityPress,
}: ProfileTabProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const visibility = user.visibility ?? "everyone";
  const visibilityName =
    visibilityOptions.find((option) => option.value === visibility)?.name ??
    "visibilityEveryone";
  // Onboarding asks only what Matches needs; the rest is added here.
  const missingLookingFor = !user.lookingFor?.length;
  const missingTags = !user.tags?.length;
  const missingBio = !user.info;

  return (
    <TabsContent value="profile" className="flex-1">
      <ScrollView
        className="flex-1 bg-light-background dark:bg-dark-background"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-4 mt-2">
          {(missingLookingFor || missingTags || missingBio) && (
            <View className="mt-3 rounded-2xl bg-light-backgroundMuted px-4 pt-4 dark:bg-dark-backgroundMuted">
              <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
                {t("finishProfileTitle")}
              </Text>
              <Text className="mt-1 text-[13px] leading-[18px] text-light-colorMuted dark:text-dark-colorMuted">
                {t("finishProfileBody")}
              </Text>
              <SettingsRow
                icon={Heart}
                title={t("whyYoureHere")}
                onPress={editCallbacks.onEditLookingFor}
                hidden={!missingLookingFor}
              />
              <SettingsRow
                icon={Tag}
                title={t("tags")}
                onPress={editCallbacks.onEditTags}
                hidden={!missingTags}
              />
              <SettingsRow
                icon={BookOpen}
                title={t("bio")}
                onPress={editCallbacks.onEditBio}
                hidden={!missingBio}
              />
            </View>
          )}
          {/* Who sees what: GET /guests/swipeable, GET /tickets/attendees and
              GET /matches/mine. */}
          <Text className="px-4 pt-3 text-xs leading-[18px] text-light-colorMuted dark:text-dark-colorMuted">
            {t("profileVisibilityNote")}
          </Text>
          <View className="px-4">
            <SettingsRow
              icon={visibility === "hidden" ? EyeOff : Eye}
              title={t("whoCanSeeMe")}
              subtitle={t(visibilityName)}
              onPress={onVisibilityPress}
            />
          </View>
          <ProfileInfoView
            user={user}
            profileFields={profileFields}
            editCallbacks={editCallbacks}
          />
        </View>
      </ScrollView>
    </TabsContent>
  );
}
