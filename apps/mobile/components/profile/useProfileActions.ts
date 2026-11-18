import { useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import {
  AccountOwnsVenuesError,
  deleteGuestPhoto,
  deleteMyAccount,
  updateSettings,
  uploadGuestPhoto,
} from "@/lib/api";
import useStore from "@/store/useStore";
import type { Settings } from "@/types/settings";
import type { User } from "@/types/user";

/**
 * The profile screen's other actions: settings, photos, signing out and
 * deleting the account. patchUser shows a change to the signed-in user.
 */
export function useProfileActions(patchUser: (patch: Partial<User>) => void) {
  const { t } = useTranslation();
  const { settings, setUser, setSettings } = useStore();
  const { userId, signOut, getToken } = useAuth();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const patchSettings = async (patch: Partial<Settings>) => {
    const nextSettings = {
      ...settings,
      ...patch,
    };

    setSettings(nextSettings);

    const shouldUpdateRemote =
      patch.language !== undefined ||
      patch.theme !== undefined ||
      patch.defaultVenueType !== undefined;

    if (!userId || !shouldUpdateRemote) {
      return;
    }

    const token = await getToken();

    if (!token) {
      return;
    }

    const remoteSettings: Record<string, string> = {};

    if (patch.language !== undefined) {
      remoteSettings.language = patch.language;
    }

    if (patch.theme !== undefined) {
      remoteSettings.theme = patch.theme;
    }

    if (patch.defaultVenueType !== undefined) {
      remoteSettings.default_venue_type = patch.defaultVenueType;
    }

    try {
      await updateSettings(token, userId, remoteSettings);
    } catch (error) {
      console.error("Failed to update settings", error);
    }
  };

  const handleAddPhoto = async () => {
    if (!userId) {
      return;
    }

    const token = await getToken();

    if (!token) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        t("permissionRequired"),
        t("photoLibraryPermissionDescription"),
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];

    try {
      const updatedUrls = await uploadGuestPhoto(
        token,
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );

      patchUser({
        photos: updatedUrls,
        imgUrl: updatedUrls[0],
      });
    } catch (error) {
      Alert.alert(
        t("uploadFailed"),
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleRemovePhoto = async (url: string) => {
    if (!userId) {
      return;
    }

    const token = await getToken();

    if (!token) {
      return;
    }

    try {
      const updatedUrls = await deleteGuestPhoto(token, url);

      patchUser({
        photos: updatedUrls,
        imgUrl: updatedUrls[0],
      });
    } catch (error) {
      Alert.alert(
        t("removeFailed"),
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);

    router.replace("/(auth)/sign-in");
  };

  const handleDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      await deleteMyAccount(token);
    } catch (error) {
      console.error("Failed to delete account", error);

      // The dialog stays open, so the user can try again or cancel.
      toast.error(t("deleteAccountFailed"), {
        description: t(
          error instanceof AccountOwnsVenuesError
            ? "deleteAccountHostsVenues"
            : "deleteAccountTryAgain",
        ),
      });
      setDeletingAccount(false);
      return;
    }

    setShowDeleteAlert(false);
    setDeletingAccount(false);
    toast.success(t("accountDeleted"));

    // Deleting the Clerk user already ended the session on the server;
    // signOut clears it on this device.
    try {
      await signOut();
    } catch (error) {
      console.error("Sign-out after deleting the account failed", error);
    }
    setUser(null);

    router.replace("/(auth)/sign-in");
  };

  return {
    patchSettings,
    handleAddPhoto,
    handleRemovePhoto,
    handleLogout,
    showDeleteAlert,
    setShowDeleteAlert,
    deletingAccount,
    handleDeleteAccount,
  };
}
