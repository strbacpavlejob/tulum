import { useEffect, useState } from "react";
import { useAuth } from "@clerk/expo";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import { fetchLaunchEmailConsent, saveLaunchEmailConsent } from "@/lib/api";
import { appPlatform } from "@/lib/app-platform";

/**
 * "Email me when the Tulum app is out": null until loaded, and while the
 * API can't store the answer yet, which hides the switch.
 */
export function useLaunchEmailOptIn() {
  const { t, i18n } = useTranslation();
  const { userId, getToken } = useAuth();
  const [launchEmailOptIn, setLaunchEmailOptIn] = useState<boolean | null>(
    null,
  );
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getToken()
      .then((token) => (token ? fetchLaunchEmailConsent(token) : null))
      .then((consent) => {
        if (!cancelled && consent?.available) {
          setLaunchEmailOptIn(consent.granted);
        }
      })
      .catch((error) => console.warn("Failed to load consent", error));
    return () => {
      cancelled = true;
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeLaunchEmailOptIn = async (optIn: boolean) => {
    const previous = launchEmailOptIn;
    setLaunchEmailOptIn(optIn);
    try {
      const token = await getToken();
      if (!token) throw new Error("No authentication token available");
      await saveLaunchEmailConsent(token, {
        granted: optIn,
        wording: t("launchEmailConsent"),
        language: i18n.language,
        platform: appPlatform(),
      });
    } catch (error) {
      console.error("Failed to save consent", error);
      setLaunchEmailOptIn(previous);
      toast.error(t("saveFailed"), {
        description: t("profileChangeNotSaved"),
      });
    }
  };

  return { launchEmailOptIn, changeLaunchEmailOptIn };
}
