import { useAuth } from "@clerk/expo";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { visibilityOptions } from "@/constants/options";
import { mapUserPatchToGuestUpdates, updateMyProfile } from "@/lib/api";
import useStore from "@/store/use-store";
import type { GuestVisibility, User } from "@/types/user";

/** Changes to the signed-in user's profile, shown at once and then saved. */
export function useProfileSaving() {
  const { t } = useTranslation();
  const { setUser } = useStore();
  const { userId, getToken } = useAuth();

  const patchUser = (patch: Partial<User>) => {
    // The store's user, not this render's: a save or an upload may have
    // finished since.
    const currentUser = useStore.getState().user;

    if (!currentUser) {
      return;
    }

    setUser({
      ...currentUser,
      ...patch,
    });
  };

  // Shows the edit at once, saves it with PATCH /users/me and puts the old
  // values back if the save fails. Returns whether it was saved.
  const saveProfile = async (patch: Partial<User>): Promise<boolean> => {
    const previousUser = useStore.getState().user;

    if (!previousUser || !userId) {
      return false;
    }

    patchUser(patch);

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("No authentication token available");
      }

      await updateMyProfile(
        token,
        userId,
        {},
        mapUserPatchToGuestUpdates(patch),
      );
      return true;
    } catch (error) {
      console.error("Failed to save profile", error);

      // Only the fields that still show this edit, so a newer edit stays.
      const currentUser = useStore.getState().user;
      const fields = (Object.keys(patch) as (keyof User)[]).filter(
        (field) => currentUser?.[field] === patch[field],
      );

      patchUser(
        Object.fromEntries(
          fields.map((field) => [field, previousUser[field]]),
        ) as Partial<User>,
      );

      // A toast, not Alert.alert: Alert.alert does nothing on web, and a
      // visibility change that silently failed would leave you seen.
      toast.error(t("saveFailed"), {
        description: t("profileChangeNotSaved"),
      });
      return false;
    }
  };

  // Who sees you on guest lists and in Matches. Confirmed with a toast,
  // because it decides who can see you.
  const saveVisibility = async (visibility: GuestVisibility) => {
    if (await saveProfile({ visibility })) {
      const option = visibilityOptions.find((o) => o.value === visibility);
      toast.success(
        t("visibilitySaved", { option: t(option?.name ?? visibility) }),
      );
    }
  };

  return { patchUser, saveProfile, saveVisibility };
}
