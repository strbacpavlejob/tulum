import LanguageSelector from "@/components/LanguageSelector";
import ClerkCaptcha from "@/components/ClerkCaptcha";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { useAuth, useSSO } from "@clerk/expo";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { useTranslation } from "react-i18next";
import {
  useFonts,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from "@expo-google-fonts/fredoka";

WebBrowser.maybeCompleteAuthSession();

const welcomeIllustration = require("@/assets/images/tulum-welcome.webp");

const COLORS = {
  purple: "#6330F5",
  pink: "#FF45C6",
  white: "#FFFFFF",
};

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();

  const [loadingProvider, setLoadingProvider] = useState<
    "oauth_apple" | "oauth_google" | null
  >(null);

  const ssoInProgress = useRef(false);

  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  const redirectUrl = Linking.createURL("/(auth)/sso-callback");

  const isCompact = screenHeight < 750;

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

  const handleSSOSignIn = async (strategy: "oauth_apple" | "oauth_google") => {
    if (ssoInProgress.current) return;

    ssoInProgress.current = true;
    setLoadingProvider(strategy);

    try {
      const result = await startSSOFlow({
        strategy,
        redirectUrl,
      });

      if (
        result.authSessionResult?.type === "cancel" ||
        result.authSessionResult?.type === "dismiss"
      ) {
        return;
      }

      if (result.createdSessionId && result.setActive) {
        await result.setActive({
          session: result.createdSessionId,
        });

        router.replace("/onboarding");
        return;
      }

      const didCompleteSignUp = await completeSsoSignUpIfNeeded(result);

      if (didCompleteSignUp) {
        router.replace("/onboarding");
      } else {
        toast.error(t("authSsoSignInFailed"));
      }
    } catch (err) {
      console.error(`${strategy} sign-in error:`, err);

      toast.error(
        err instanceof Error ? err.message : t("authSsoSignInFailed"),
      );
    } finally {
      ssoInProgress.current = false;
      setLoadingProvider(null);
    }
  };

  if (!isAuthLoaded || isSignedIn || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-backgroundFocus dark:bg-dark-backgroundFocus"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* HERO */}
        <View
          className="relative flex-1 overflow-hidden"
          style={{
            minHeight: isCompact ? 310 : 390,
            backgroundColor: COLORS.purple,
          }}
        >
          {/* Background illustration */}
          <Image
            source={welcomeIllustration}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
            }}
            contentFit="cover"
            contentPosition="center"
            accessibilityLabel="Tulum capybara mascot holding a phone"
          />

          {/* Language selector */}
          <View className="absolute right-4 top-4 z-20">
            <LanguageSelector />
          </View>

          {/* Brand text */}
          <View
            className="absolute bottom-0 left-0 right-0 items-center px-4"
            style={{
              paddingBottom: isCompact ? 12 : 20,
            }}
          >
            {/* Tulum logo text */}
            <View className="flex-row items-center justify-center">
              <Text
                style={{
                  fontFamily: "Fredoka_700Bold",
                  fontSize: isCompact ? 48 : 58,
                  lineHeight: isCompact ? 58 : 68,
                  color: COLORS.white,
                  letterSpacing: -2,
                  textShadowColor: "rgba(74, 21, 170, 0.35)",
                  textShadowOffset: { width: 0, height: 3 },
                  textShadowRadius: 8,
                }}
              >
                Tulum
              </Text>
            </View>

            {/* Tagline */}
            <Text
              style={{
                fontFamily: "Fredoka_500Medium",
                fontSize: isCompact ? 13 : 16,
                lineHeight: isCompact ? 19 : 23,
                color: "rgba(255,255,255,0.92)",
                textAlign: "center",
                marginTop: 1,
                textShadowColor: "rgba(50, 10, 110, 0.3)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}
            >
              {t("authMeetPeopleTagline")}
            </Text>
          </View>
        </View>

        {/* SIGN-IN CARD */}
        <View className="rounded-t-[32px] bg-light-background px-6 pb-6 pt-8 dark:bg-dark-background">
          <Text
            className="mb-1.5 text-light-colorStrong dark:text-dark-colorStrong"
            style={{
              fontFamily: "Fredoka_700Bold",
              fontSize: 26,
              lineHeight: 34,
            }}
          >
            {t("authSignInTitle")}
          </Text>

          <Text
            className="mb-6 text-light-colorMuted dark:text-dark-colorMuted"
            style={{
              fontFamily: "Fredoka_500Medium",
              fontSize: 15,
            }}
          >
            {t("authSignInSubtitle")}
          </Text>

          {/* Apple */}
          <Button
            disabled={loadingProvider !== null}
            onPress={() => handleSSOSignIn("oauth_apple")}
            className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
          >
            {loadingProvider === "oauth_apple" ? (
              <ActivityIndicator color={COLORS.purple} />
            ) : (
              <AppleIcon fill="#737373" />
            )}

            <Text
              className="text-light-colorStrong dark:text-dark-colorStrong"
              style={{
                fontFamily: "Fredoka_600SemiBold",
                fontSize: 16,
              }}
            >
              {t("authContinueWithApple")}
            </Text>
          </Button>

          {/* Google */}
          <Button
            disabled={loadingProvider !== null}
            onPress={() => handleSSOSignIn("oauth_google")}
            className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
          >
            {loadingProvider === "oauth_google" ? (
              <ActivityIndicator color={COLORS.purple} />
            ) : (
              <GoogleIcon />
            )}

            <Text
              className="text-light-colorStrong dark:text-dark-colorStrong"
              style={{
                fontFamily: "Fredoka_600SemiBold",
                fontSize: 16,
              }}
            >
              {t("authContinueWithGoogle")}
            </Text>
          </Button>

          <ClerkCaptcha />

          {/* Terms */}
          <Text
            className="mt-5 text-center text-light-colorMuted dark:text-dark-colorMuted"
            style={{
              fontFamily: "Fredoka_500",
              fontSize: 13,
              lineHeight: 20,
            }}
          >
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
      </ScrollView>
    </SafeAreaView>
  );
}
