import Blob from "@/components/Blob";
import LoadingIndicator from "@/components/loading-indicator";

import Tags from "@/components/Tags";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { VenueType } from "@/types/filter";
import { Settings } from "@/types/settings";
import { GuestVisibility } from "@/types/user";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { ProfileInfoFieldKey } from "@/components/ProfileInfoView";
import {
  appLanguageOptions,
  themeOptions,
  venueOptions,
  visibilityOptions,
} from "@/constants/options";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import SettingsTab from "@/components/SettingsTab";
import ProfileTab from "@/components/ProfileTab";
import { DeleteAccountDialog } from "@/components/profile/DeleteAccountDialog";
import { SuggestVenueSheet } from "@/components/profile/SuggestVenueSheet";
import { BugReportSheet } from "@/components/profile/BugReportSheet";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import {
  buildProfileEditCallbacks,
  buildProfileFields,
  openProfileFieldEditor,
} from "@/components/profile/profileFields";
import { useFieldEditSheet } from "@/components/profile/useFieldEditSheet";
import { useLaunchEmailOptIn } from "@/components/profile/useLaunchEmailOptIn";
import { useProfileActions } from "@/components/profile/useProfileActions";
import { useProfileSaving } from "@/components/profile/useProfileSaving";
import { ProfileTabTrigger } from "@/components/profile/ProfileTabTrigger";

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const { user, settings } = useStore();

  const [activeTab, setActiveTab] = useState("profile");

  const {
    editSheetRef,
    editConfig,
    setEditConfig,
    singleValue,
    setSingleValue,
    multiValues,
    textValue,
    setTextValue,
    openSingleSelect,
    openMultiSelect,
    openTextEdit,
    confirmEdit,
    toggleMultiValue,
  } = useFieldEditSheet();
  const bugSheetRef = useRef<BottomSheetModal>(null);
  const venueSheetRef = useRef<BottomSheetModal>(null);

  const { patchUser, saveProfile, saveVisibility } = useProfileSaving();
  const { launchEmailOptIn, changeLaunchEmailOptIn } = useLaunchEmailOptIn();
  const {
    patchSettings,
    handleAddPhoto,
    handleRemovePhoto,
    handleLogout,
    showDeleteAlert,
    setShowDeleteAlert,
    deletingAccount,
    handleDeleteAccount,
  } = useProfileActions(patchUser);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  const profileFields = buildProfileFields(user, t);

  const handleEditProfileField = (fieldKey: ProfileInfoFieldKey) =>
    openProfileFieldEditor(fieldKey, {
      user,
      t,
      openTextEdit,
      openSingleSelect,
      openMultiSelect,
      saveProfile,
    });

  const profileAvatarUri = user.photos?.[0] || user.imgUrl;

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      style={{
        backgroundColor: theme.backgroundFocus,
      }}
    >
      <View className="flex-1 items-center justify-center px-5">
        <View className="absolute inset-0" pointerEvents="none">
          <Blob width="100%" color="rgba(255,255,255,0.12)" />
        </View>

        <View className="items-center gap-2.5">
          <Avatar alt="Your avatar" className="h-20 w-20">
            <AvatarImage
              source={{
                uri: profileAvatarUri,
              }}
            />
          </Avatar>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {user.firstName}, {user.age}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 4,
            }}
          >
            <Tags tags={user.tags ?? []} />
          </ScrollView>
        </View>
      </View>

      <View
        className="overflow-hidden rounded-t-[32px]"
        style={{
          flex: 2,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -8,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 gap-0"
        >
          <TabsList className="h-12 w-full rounded-none border-b px-0 py-0 bg-light-background dark:bg-dark-background border-b-light-border dark:border-b-dark-border">
            <ProfileTabTrigger
              value="profile"
              label={t("profile")}
              active={activeTab === "profile"}
            />

            <ProfileTabTrigger
              value="settings"
              label={t("settings")}
              active={activeTab === "settings"}
            />
          </TabsList>

          <ProfileTab
            user={user}
            profileFields={profileFields}
            editCallbacks={buildProfileEditCallbacks({
              user,
              t,
              openTextEdit,
              openSingleSelect,
              openMultiSelect,
              saveProfile,
              handleAddPhoto,
              handleRemovePhoto,
              handleEditProfileField,
            })}
            onVisibilityPress={() => {
              openSingleSelect(
                t("whoCanSeeMe"),
                visibilityOptions,
                user.visibility ?? "everyone",
                (value) => {
                  void saveVisibility(value as GuestVisibility);
                },
              );
            }}
          />

          <SettingsTab
            settings={settings}
            venueOptions={venueOptions}
            locationName="Belgrade"
            onThemePress={() => {
              openSingleSelect(
                t("theme"),
                themeOptions,
                settings.theme,
                (value) => {
                  void patchSettings({
                    theme: value as Settings["theme"],
                  });
                },
              );
            }}
            onNotificationsChange={(enabled) => {
              void patchSettings({
                notificationsEnabled: enabled,
              });
            }}
            launchEmailOptIn={launchEmailOptIn}
            onLaunchEmailOptInChange={(optIn) => {
              void changeLaunchEmailOptIn(optIn);
            }}
            onLanguagePress={() => {
              openSingleSelect(
                t("language"),
                appLanguageOptions,
                settings.language,
                (value) => {
                  void patchSettings({
                    language: value as Settings["language"],
                  });
                },
              );
            }}
            onVenueTypePress={() => {
              openSingleSelect(
                t("defaultVenueType"),
                venueOptions,
                settings.defaultVenueType ?? "",
                (value) => {
                  void patchSettings({
                    defaultVenueType: value as VenueType,
                  });
                },
              );
            }}
            onReportBugPress={() => {
              bugSheetRef.current?.present();
            }}
            onSuggestVenuePress={() => {
              venueSheetRef.current?.present();
            }}
            onLogout={handleLogout}
            onDeleteAccountPress={() => {
              setShowDeleteAlert(true);
            }}
          />
        </Tabs>
      </View>

      <ProfileEditSheet
        editSheetRef={editSheetRef}
        setEditConfig={setEditConfig}
        editConfig={editConfig}
        singleValue={singleValue}
        setSingleValue={setSingleValue}
        multiValues={multiValues}
        toggleMultiValue={toggleMultiValue}
        confirmEdit={confirmEdit}
        textValue={textValue}
        setTextValue={setTextValue}
      />

      <BugReportSheet bugSheetRef={bugSheetRef} />

      <SuggestVenueSheet venueSheetRef={venueSheetRef} />

      <DeleteAccountDialog
        showDeleteAlert={showDeleteAlert}
        deletingAccount={deletingAccount}
        setShowDeleteAlert={setShowDeleteAlert}
        handleDeleteAccount={handleDeleteAccount}
      />
    </SafeAreaView>
  );
}
