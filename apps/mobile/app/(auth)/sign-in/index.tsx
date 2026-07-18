import Blob from "@/components/Blob";
import LanguageSelector from "@/components/LanguageSelector";
import Logo from "@/components/illustrations/logo";
import { Text } from "@/components/ui/text";
import * as WebBrowser from "expo-web-browser";
import { Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useSSO } from "@clerk/expo";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import { useEffect } from "react";
import { toast } from "sonner-native";
import { useTranslation } from "react-i18next";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();

  const setErrorWithToast = (message: string) => {
    toast.error(message);
  };

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn) return;
    router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  const completeSsoSignUpIfNeeded = async (result: {
    setActive?: ((params: { session: string }) => Promise<void>) | null;
    signUp?: {
      status?: string | null;
      missingFields?: string[];
      emailAddress?: string | null;
      update?: (params: {
        username?: string;
        lastName?: string;
        password?: string;
      }) => Promise<{
        status?: string | null;
        createdSessionId?: string | null;
      }>;
      createdSessionId?: string | null;
    } | null;
  }) => {
    const signUp = result.signUp;

    if (!signUp || !result.setActive) return false;
    if (signUp.status !== "missing_requirements") return false;

    const missing = signUp.missingFields ?? [];
    if (!missing.length || !signUp.update) return false;

    const emailPrefix =
      signUp.emailAddress?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") ??
      "user";
    const suffix = Math.floor(1000 + Math.random() * 9000);

    const updatePayload: {
      username?: string;
      lastName?: string;
      password?: string;
    } = {};

    if (missing.includes("username")) {
      updatePayload.username = `${emailPrefix}${suffix}`.toLowerCase();
    }
    if (missing.includes("last_name")) {
      updatePayload.lastName = "User";
    }
    if (missing.includes("password")) {
      updatePayload.password = `Sso!${suffix}Tmp#${Date.now()}`;
    }

    const updatedSignUp = await signUp.update(updatePayload);
    const sessionId = updatedSignUp.createdSessionId ?? signUp.createdSessionId;

    if (sessionId) {
      await result.setActive({ session: sessionId });
      return true;
    }

    return false;
  };

  // const redirectUrl =
  //   Platform.OS === "web"
  //     ? `${window.location.origin}/onboarding`
  //     : Linking.createURL("/onboarding");

  const handleSSOSignIn = async (strategy: "oauth_apple" | "oauth_google") => {
    try {
      const result = await startSSOFlow({
        strategy,
        // redirectUrl,
      });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace("/onboarding");
        return;
      }

      const didCompleteSignUp = await completeSsoSignUpIfNeeded(result);
      if (didCompleteSignUp) {
        router.replace("/onboarding");
      } else {
        setErrorWithToast(t("authSocialAutoSignInFailed"));
      }
    } catch (err) {
      console.error(`${strategy} sign-in error:`, err);
      setErrorWithToast(
        err instanceof Error ? err.message : t("authSsoSignInFailed"),
      );
    }
  };

  const Captcha = () => {
    if (Platform.OS !== "web") return null;

    return <div id="clerk-captcha" style={{ marginTop: 12 }} />;
  };

  if (!isAuthLoaded || isSignedIn) {
    return null;
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-backgroundFocus dark:bg-dark-backgroundFocus"
    >
      <View className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <View className="absolute inset-0" pointerEvents="none">
          <Blob width="100%" color="rgba(255,255,255,0.10)" />
        </View>

        <View
          className="w-20 h-20 p-4 rounded-[28px] items-center justify-center mb-5"
          style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
        >
          <Logo />
        </View>

        <Text
          style={{
            fontSize: 36,
            fontWeight: "800",
            color: "#fff",
            letterSpacing: -0.5,
          }}
        >
          Tulum
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,0.75)",
            marginTop: 6,
            textAlign: "center",
          }}
        >
          {t("authMeetPeopleTagline")}
        </Text>
      </View>

      <View className="rounded-t-[32px] bg-light-background px-6 pt-8 pb-6 dark:bg-dark-background">
        <Text className="mb-1.5 text-[22px] font-bold text-light-colorStrong dark:text-dark-colorStrong">
          {t("authSignInTitle")}
        </Text>

        <Text className="mb-6 text-sm text-light-colorMuted dark:text-dark-colorMuted">
          {t("authSignInSubtitle")}
        </Text>

        <Pressable
          onPress={() => handleSSOSignIn("oauth_apple")}
          className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
        >
          <AppleIcon fill="#737373" />
          <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
            {t("authContinueWithApple")}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleSSOSignIn("oauth_google")}
          className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
        >
          <GoogleIcon />
          <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
            {t("authContinueWithGoogle")}
          </Text>
        </Pressable>

        {/* <View className="flex-row items-center my-4">
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text
            style={{
              marginHorizontal: 12,
              fontSize: 13,
              color: theme.colorMuted,
            }}
          >
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View> */}
        <Captcha />

        <Text className="mt-5 text-center leading-[18px] text-light-colorMuted dark:text-dark-colorMuted">
          {t("authTermsPrefix")}{" "}
          <Text className="text-light-color dark:text-dark-color">
            {t("authTermsOfService")}
          </Text>{" "}
          {t("authTermsAnd")}{" "}
          <Text className="text-light-color dark:text-dark-color">
            {t("authPrivacyPolicy")}
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
