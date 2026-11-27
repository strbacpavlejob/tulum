import LoadingIndicator from "@/components/loading-indicator";
import { Text } from "@/components/ui/text";
import ClerkCaptcha from "@/components/clerk-captcha";
import { retryOnRateLimit } from "@/lib/clerk-retry";
import i18n from "@/lib/i18n";
import { savePendingJoin } from "@/lib/pending-join";
import { completeMissingSignUpFields } from "@/lib/sign-up-fields";
import { useClerk } from "@clerk/expo";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Where Clerk sends a sign-up that still needs a field Google didn't give
// (a last name, say). Nothing is served there: navigate() below catches it
// and finishes the sign-up here. Without it Clerk used its own hosted page,
// which then sent the guest to the site (tulum-app.com) instead of the app.
const CONTINUE_SIGN_UP = "/sso-callback/continue";

/** This app's path for a URL Clerk navigates to, or null for another site. */
function appPath(to: string): string | null {
  if (to.startsWith("/")) return to;
  if (Platform.OS === "web" && to.startsWith(window.location.origin)) {
    return to.slice(window.location.origin.length) || "/";
  }
  return null;
}

export default function SsoCallbackScreen() {
  const clerk = useClerk();
  const router = useRouter();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  // Clerk answered 429 and the call is waiting to go again.
  const [waiting, setWaiting] = useState(false);
  // The event to join, if sign-in started on its page (see sign-in).
  const { join, src } = useLocalSearchParams<{ join?: string; src?: string }>();

  useEffect(() => {
    if (join) savePendingJoin(join, src);
  }, [join, src]);

  useEffect(() => {
    let cancelled = false;
    let navigated = false;

    const navigate = async (to: string) => {
      if (cancelled) return;
      navigated = true;
      if (to.includes(CONTINUE_SIGN_UP)) {
        const sessionId = await completeMissingSignUpFields(
          clerk.client?.signUp,
        );
        if (!sessionId) {
          setError(i18n.t("authSsoSignInFailed"));
          return;
        }
        await clerk.setActive({ session: sessionId });
        router.replace("/onboarding");
        return;
      }
      const path = appPath(to);
      if (path) router.replace(path as Href);
      else if (Platform.OS === "web") window.location.assign(to);
    };

    const completeRedirect = async () => {
      try {
        await retryOnRateLimit(
          () =>
            clerk.handleRedirectCallback(
              {
                signInUrl: "/sign-in",
                signUpUrl: "/sign-in",
                continueSignUpUrl: CONTINUE_SIGN_UP,
                signInFallbackRedirectUrl: "/onboarding",
                signUpFallbackRedirectUrl: "/onboarding",
              },
              navigate,
            ),
          () => setWaiting(true),
        );
        if (!cancelled && !navigated) {
          router.replace("/onboarding");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : i18n.t("authSsoSignInFailed"),
          );
        }
      } finally {
        setWaiting(false);
      }
    };

    void completeRedirect();

    return () => {
      cancelled = true;
    };
  }, [clerk, router]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <ClerkCaptcha />
      <View className="flex-1 items-center justify-center px-6">
        <LoadingIndicator />
        <Text className="mt-3.5 text-center text-base text-light-cardForeground dark:text-dark-cardForeground">
          {error ?? (waiting ? t("authBusyRetrying") : "Completing sign in...")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
