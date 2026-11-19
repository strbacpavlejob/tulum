import LanguageSelector from "@/components/language-selector";
import ClerkCaptcha from "@/components/clerk-captcha";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useInAppBrowser } from "@/hooks/use-in-app-browser";
import {
  isRateLimited,
  retryDelayMs,
  retryOnRateLimit,
} from "@/lib/clerk-retry";
import { chromeIntentUrl } from "@/lib/in-app-browser";
import { savePendingJoin } from "@/lib/pending-join";
import { generatedPassword, generatedUsername } from "@/lib/sign-up-fields";
import { useAuth, useClerk, useSSO } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { Mail } from "lucide-react-native";

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

// On the links too: ui/text's own size class would beat the size they inherit.
const LEGAL_TEXT_STYLE = {
  fontFamily: "Fredoka_500Medium",
  fontSize: 13,
  lineHeight: 20,
};

export default function SignInScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { height: screenHeight } = useWindowDimensions();

  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  // Google refuses sign-in inside Instagram's or Facebook's own browser.
  const inAppBrowser = useInAppBrowser();

  const [loadingProvider, setLoadingProvider] = useState<
    "oauth_apple" | "oauth_google" | null
  >(null);

  const ssoInProgress = useRef(false);

  // Clerk answered 429 and a call is waiting to go again.
  const [waiting, setWaiting] = useState(false);
  // Clerk refused to start Google or Apple (429). Browsers open their
  // window only from a tap, so the guest taps again once this has passed.
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (cooldownEndsAt === null) return;
    const tick = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= cooldownEndsAt) setCooldownEndsAt(null);
    }, 250);
    return () => clearInterval(tick);
  }, [cooldownEndsAt]);
  const cooldownSeconds =
    cooldownEndsAt === null
      ? 0
      : Math.max(1, Math.ceil((cooldownEndsAt - now) / 1000));

  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  // An event this guest asked to join (from /e/[id]) is saved, and also
  // rides in the return URL in case storage is lost on the way.
  const { join, src } = useLocalSearchParams<{ join?: string; src?: string }>();
  useEffect(() => {
    if (join) savePendingJoin(join, src);
  }, [join, src]);

  const redirectUrl = Linking.createURL("/(auth)/sso-callback", {
    queryParams: join ? { join, ...(src ? { src } : {}) } : undefined,
  });

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

    const updatePayload: {
      username?: string;
      lastName?: string;
      password?: string;
    } = {};

    if (missing.includes("username")) {
      updatePayload.username = generatedUsername(signUp.emailAddress);
    }

    if (missing.includes("last_name")) {
      updatePayload.lastName = "User";
    }

    if (missing.includes("password")) {
      updatePayload.password = generatedPassword();
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
      if (isRateLimited(err)) {
        await continueAfterRateLimit(err);
        return;
      }
      console.error(`${strategy} sign-in error:`, err);

      toast.error(
        err instanceof Error ? err.message : t("authSsoSignInFailed"),
      );
    } finally {
      ssoInProgress.current = false;
      setLoadingProvider(null);
      setWaiting(false);
    }
  };

  // Clerk allows 5 sign-ins and 5 sign-ups every 10 s from one IP, and a
  // venue's guests can share one. When Google or Apple has already answered,
  // only creating the account was refused: that is tried again here, with
  // a note instead of an error. Before that, the guest taps again once the
  // wait is over.
  const continueAfterRateLimit = async (refusal: unknown) => {
    const client = clerk.client;
    if (client?.signIn.firstFactorVerification.status !== "transferable") {
      setNow(Date.now());
      setCooldownEndsAt(Date.now() + retryDelayMs(refusal, 1));
      return;
    }
    try {
      const signUp = await retryOnRateLimit(
        () => client.signUp.create({ transfer: true }),
        () => setWaiting(true),
      );
      if (signUp.createdSessionId) {
        await clerk.setActive({ session: signUp.createdSessionId });
        router.replace("/onboarding");
      } else if (
        await completeSsoSignUpIfNeeded({ signUp, setActive: clerk.setActive })
      ) {
        router.replace("/onboarding");
      } else {
        toast.error(t("authSsoSignInFailed"));
      }
    } catch (err) {
      console.error("sign-up after Clerk's rate limit failed:", err);
      toast.error(
        isRateLimited(err) ? t("authBusyLater") : t("authSsoSignInFailed"),
      );
    }
  };

  const openEmailSignIn = () => {
    router.push({
      pathname: "/(auth)/sign-in/email",
      params: join ? { join, ...(src ? { src } : {}) } : {},
    });
  };

  const openInChrome = () => {
    if (typeof window === "undefined") return;
    window.location.href = chromeIntentUrl(window.location.href);
  };

  const ssoDisabled = loadingProvider !== null || cooldownEndsAt !== null;

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

          {inAppBrowser ? (
            <View className="mb-3 rounded-2xl bg-light-backgroundMuted p-4 dark:bg-dark-backgroundMuted">
              <Text
                className="mb-1 text-light-colorStrong dark:text-dark-colorStrong"
                style={{ fontFamily: "Fredoka_600SemiBold", fontSize: 16 }}
              >
                {t("authInAppTitle")}
              </Text>
              <Text
                className="text-light-colorMuted dark:text-dark-colorMuted"
                style={{ fontFamily: "Fredoka_500Medium", fontSize: 14 }}
              >
                {inAppBrowser.platform === "android"
                  ? t("authInAppBodyAndroid", { app: inAppBrowser.app })
                  : t("authInAppBodyIos", { app: inAppBrowser.app })}
              </Text>
              {inAppBrowser.platform === "android" && (
                <Button
                  onPress={openInChrome}
                  className="mt-3 h-12 rounded-2xl bg-light-color dark:bg-dark-color"
                >
                  <Text
                    className="text-white"
                    style={{ fontFamily: "Fredoka_600SemiBold", fontSize: 16 }}
                  >
                    {t("authOpenInChrome")}
                  </Text>
                </Button>
              )}
            </View>
          ) : (
            <>
              {/* Apple */}
              <Button
                disabled={ssoDisabled}
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
                disabled={ssoDisabled}
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
            </>
          )}

          {/* Email code: the fallback for in-app browsers and for anyone
              without Google or Apple. */}
          <Button
            disabled={loadingProvider !== null}
            onPress={openEmailSignIn}
            className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
          >
            <Mail size={20} color={theme.colorStrong} />
            <Text
              className="text-light-colorStrong dark:text-dark-colorStrong"
              style={{
                fontFamily: "Fredoka_600SemiBold",
                fontSize: 16,
              }}
            >
              {t("authContinueWithEmail")}
            </Text>
          </Button>

          {waiting && (
            <Text
              className="mt-1 text-center text-light-colorMuted dark:text-dark-colorMuted"
              style={LEGAL_TEXT_STYLE}
            >
              {t("authBusyRetrying")}
            </Text>
          )}
          {cooldownEndsAt !== null && (
            <Text
              className="mt-1 text-center text-light-colorMuted dark:text-dark-colorMuted"
              style={LEGAL_TEXT_STYLE}
            >
              {t("authBusyTryAgain", { seconds: cooldownSeconds })}
            </Text>
          )}

          <ClerkCaptcha />

          {/* Terms */}
          <Text
            className="mt-5 text-center text-light-colorMuted dark:text-dark-colorMuted"
            style={LEGAL_TEXT_STYLE}
          >
            {t("authTermsPrefix")}{" "}
            <Link href="https://tulum-app.com/terms" asChild>
              <Text
                accessibilityRole="link"
                className="text-light-color dark:text-dark-color"
                style={LEGAL_TEXT_STYLE}
              >
                {t("authTermsOfService")}
              </Text>
            </Link>{" "}
            {t("authTermsAnd")}{" "}
            <Link href="https://tulum-app.com/privacy" asChild>
              <Text
                accessibilityRole="link"
                className="text-light-color dark:text-dark-color"
                style={LEGAL_TEXT_STYLE}
              >
                {t("authPrivacyPolicy")}
              </Text>
            </Link>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
