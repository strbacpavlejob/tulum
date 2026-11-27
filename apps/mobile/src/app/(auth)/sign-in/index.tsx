import LanguageSelector from "@/components/language-selector";
import ClerkCaptcha from "@/components/clerk-captcha";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import Logo from "@/components/illustrations/logo";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { useInAppBrowser } from "@/hooks/use-in-app-browser";
import {
  isRateLimited,
  retryDelayMs,
  retryOnRateLimit,
} from "@/lib/clerk-retry";
import { FREDOKA, fredoka, type FredokaWeight } from "@/lib/fredoka";
import { chromeIntentUrl } from "@/lib/in-app-browser";
import { savePendingJoin } from "@/lib/pending-join";
import { APPLE_SIGN_IN_ENABLED } from "@/lib/sign-in-options";
import { completeMissingSignUpFields } from "@/lib/sign-up-fields";
import { useAuth, useClerk, useSSO } from "@clerk/expo";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Mail } from "lucide-react-native";

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";
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
  white: "#FFFFFF",
  softWhite: "rgba(255, 255, 255, 0.85)",
  // The text on white buttons, and the shades over the picture.
  ink: "#1A0B4A",
};

// Set here because ui/button's sm: height would win over a class on wide
// web screens.
const PILL_STYLE = { height: 54, borderRadius: 999 };

const TEXT_SHADOW = {
  textShadowColor: "rgba(26, 11, 74, 0.45)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 8,
};

type Choice = "signUp" | "signIn";

export default function SignInScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

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
  const { join, src, mode } = useLocalSearchParams<{
    join?: string;
    src?: string;
    mode?: string;
  }>();
  useEffect(() => {
    if (join) savePendingJoin(join, src);
  }, [join, src]);
  const joinParams = join ? { join, ...(src ? { src } : {}) } : {};

  // The welcome screen asks "Create account" or "Sign in"; the choice opens
  // this screen again with the ways to do it (Google, email).
  const choice: Choice | null =
    mode === "signUp" || mode === "signIn" ? mode : null;

  // The browser comes back to sso-callback's own address in this tab; the
  // native app to the scheme URL allowlisted in Clerk
  // (tulumapp:///(auth)/sso-callback).
  const redirectUrl = Linking.createURL(
    Platform.OS === "web" ? "/sso-callback" : "/(auth)/sso-callback",
    { queryParams: join ? { join, ...(src ? { src } : {}) } : undefined },
  );

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn) return;
    router.replace("/");
  }, [isAuthLoaded, isSignedIn, router]);

  const completeSsoSignUpIfNeeded = async (result: {
    setActive?: ((params: { session: string }) => Promise<void>) | null;
    signUp?: Parameters<typeof completeMissingSignUpFields>[0];
  }) => {
    if (!result.setActive) return false;
    const sessionId = await completeMissingSignUpFields(result.signUp);
    if (!sessionId) return false;
    await result.setActive({ session: sessionId });
    return true;
  };

  const handleSSOSignIn = async (strategy: "oauth_apple" | "oauth_google") => {
    if (ssoInProgress.current) return;

    ssoInProgress.current = true;
    setLoadingProvider(strategy);
    // Set once this tab is on its way to Google, so the button keeps its
    // spinner until the page is gone.
    let leavingPage = false;

    try {
      if (Platform.OS === "web") {
        // In a browser, Google takes this tab over and comes back to
        // sso-callback, which finishes the sign-in. A popup (what
        // startSSOFlow opens on web) stayed open as a second, signed-in tab.
        const signIn = clerk.client?.signIn;
        if (!signIn) throw new Error(t("authSignInLoading"));
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl,
          redirectUrlComplete: Linking.createURL("/onboarding"),
        });
        leavingPage = true;
        return;
      }

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
      setWaiting(false);
      if (!leavingPage) {
        ssoInProgress.current = false;
        setLoadingProvider(null);
      }
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

  // Pushed rather than set, so the phone's or browser's back button
  // returns to the welcome screen.
  const choose = (next: Choice) => {
    router.push({
      pathname: "/(auth)/sign-in",
      params: { ...joinParams, mode: next },
    });
  };

  const backToWelcome = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({ pathname: "/(auth)/sign-in", params: joinParams });
    }
  };

  // The email form opens on the step the guest chose.
  const openEmailSignIn = () => {
    router.push({
      pathname: "/(auth)/sign-in/email",
      params: { ...joinParams, mode: choice ?? "signIn" },
    });
  };

  const openInChrome = () => {
    if (typeof window === "undefined") return;
    window.location.href = chromeIntentUrl(window.location.href);
  };

  const ssoDisabled = loadingProvider !== null || cooldownEndsAt !== null;

  const font = (weight: FredokaWeight) => fredoka(weight, i18n.language);
  // On the links too: ui/text's own size class would beat the size they
  // inherit.
  const legalText = {
    ...font("medium"),
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.softWhite,
  };
  const legalLink = {
    ...legalText,
    ...font("semiBold"),
    color: COLORS.white,
    textDecorationLine: "underline" as const,
  };
  const buttonLabel = { ...font("semiBold"), fontSize: 17 };

  if (!isAuthLoaded || isSignedIn || !fontsLoaded) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.purple }}>
      <Image
        source={welcomeIllustration}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
        contentFit="cover"
        // Phones crop the picture's sides; wide screens crop its top and
        // bottom, and this keeps the mascot's face in view there.
        contentPosition={{ top: "30%", left: "50%" }}
        accessibilityLabel="Tulum capybara mascot holding a phone"
      />

      {/* Shades that keep the white text readable on the picture */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(26, 11, 74, 0.5)", "rgba(26, 11, 74, 0)"]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "35%",
        }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(26, 11, 74, 0)",
          "rgba(26, 11, 74, 0.7)",
          "rgba(26, 11, 74, 0.95)",
        ]}
        locations={[0, 0.5, 1]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "65%",
        }}
      />

      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View className="z-20 px-6 pt-4">
            {/* Language selector */}
            <View className="z-20 flex-row justify-end">
              <LanguageSelector />
            </View>

            {/* Logo and name in one row, the tagline under them */}
            <View className="mt-6 items-center">
              <View className="flex-row items-center gap-3">
                <Logo
                  color={COLORS.white}
                  variant="knockout"
                  width={52}
                  height={44}
                />
                <Text
                  style={{
                    // Fredoka in every language: the name is in Latin letters.
                    fontFamily: FREDOKA.bold,
                    fontSize: 50,
                    lineHeight: 58,
                    letterSpacing: -1.5,
                    color: COLORS.white,
                    ...TEXT_SHADOW,
                  }}
                >
                  Tulum
                </Text>
              </View>

              <Text
                style={{
                  ...font("medium"),
                  fontSize: 18,
                  lineHeight: 24,
                  color: COLORS.white,
                  textAlign: "center",
                  marginTop: 4,
                  ...TEXT_SHADOW,
                }}
              >
                {t("authMeetPeopleTagline")}
              </Text>
            </View>
          </View>

          <View
            className="w-full self-center px-6 pb-6 pt-10"
            style={{ maxWidth: 480 }}
          >
            {choice ? (
              <>
                <Text
                  style={{
                    ...font("bold"),
                    fontSize: 24,
                    lineHeight: 30,
                    color: COLORS.white,
                    textAlign: "center",
                  }}
                >
                  {choice === "signUp"
                    ? t("authCreateAccountTitle")
                    : t("authSignInTitle")}
                </Text>

                {/* Terms */}
                <Text
                  style={{
                    ...legalText,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  {t("authTermsPrefix")}{" "}
                  <Link href="https://tulum-app.com/terms" asChild>
                    <Text accessibilityRole="link" style={legalLink}>
                      {t("authTermsOfService")}
                    </Text>
                  </Link>{" "}
                  {t("authTermsAnd")}{" "}
                  <Link href="https://tulum-app.com/privacy" asChild>
                    <Text accessibilityRole="link" style={legalLink}>
                      {t("authPrivacyPolicy")}
                    </Text>
                  </Link>
                </Text>

                <View className="mt-6 gap-3">
                  {inAppBrowser ? (
                    <View className="rounded-2xl border border-white/15 bg-white/10 p-4">
                      <Text
                        className="mb-1"
                        style={{
                          ...font("semiBold"),
                          fontSize: 16,
                          color: COLORS.white,
                        }}
                      >
                        {t("authInAppTitle")}
                      </Text>
                      <Text
                        style={{
                          ...font("medium"),
                          fontSize: 14,
                          color: COLORS.softWhite,
                        }}
                      >
                        {inAppBrowser.platform === "android"
                          ? t("authInAppBodyAndroid", { app: inAppBrowser.app })
                          : t("authInAppBodyIos", { app: inAppBrowser.app })}
                      </Text>
                      {inAppBrowser.platform === "android" && (
                        <Button
                          onPress={openInChrome}
                          className="mt-3 bg-white active:opacity-80"
                          style={PILL_STYLE}
                        >
                          <Text style={{ ...buttonLabel, color: COLORS.ink }}>
                            {t("authOpenInChrome")}
                          </Text>
                        </Button>
                      )}
                    </View>
                  ) : (
                    <>
                      {/* Apple */}
                      {APPLE_SIGN_IN_ENABLED && (
                        <Button
                          disabled={ssoDisabled}
                          onPress={() => handleSSOSignIn("oauth_apple")}
                          className="flex-row items-center justify-center gap-3 bg-white active:opacity-80"
                          style={PILL_STYLE}
                        >
                          {loadingProvider === "oauth_apple" ? (
                            <ActivityIndicator color={COLORS.purple} />
                          ) : (
                            <AppleIcon fill="#000000" />
                          )}
                          <Text style={{ ...buttonLabel, color: COLORS.ink }}>
                            {t("authContinueWithApple")}
                          </Text>
                        </Button>
                      )}

                      {/* Google */}
                      <Button
                        disabled={ssoDisabled}
                        onPress={() => handleSSOSignIn("oauth_google")}
                        className="flex-row items-center justify-center gap-3 bg-white active:opacity-80"
                        style={PILL_STYLE}
                      >
                        {loadingProvider === "oauth_google" ? (
                          <ActivityIndicator color={COLORS.purple} />
                        ) : (
                          <GoogleIcon />
                        )}
                        <Text style={{ ...buttonLabel, color: COLORS.ink }}>
                          {t("authContinueWithGoogle")}
                        </Text>
                      </Button>
                    </>
                  )}

                  {/* Email and password: for in-app browsers and for anyone
                      without Google. */}
                  <Button
                    disabled={loadingProvider !== null}
                    onPress={openEmailSignIn}
                    className="flex-row items-center justify-center gap-3 border-[1.5px] border-white bg-transparent shadow-none active:opacity-80"
                    style={PILL_STYLE}
                  >
                    <Mail size={20} color={COLORS.white} />
                    <Text style={{ ...buttonLabel, color: COLORS.white }}>
                      {t("authContinueWithEmail")}
                    </Text>
                  </Button>
                </View>

                {waiting && (
                  <Text
                    style={{
                      ...legalText,
                      textAlign: "center",
                      marginTop: 12,
                    }}
                  >
                    {t("authBusyRetrying")}
                  </Text>
                )}
                {cooldownEndsAt !== null && (
                  <Text
                    style={{
                      ...legalText,
                      textAlign: "center",
                      marginTop: 12,
                    }}
                  >
                    {t("authBusyTryAgain", { seconds: cooldownSeconds })}
                  </Text>
                )}

                <ClerkCaptcha />

                <Button
                  disabled={loadingProvider !== null}
                  onPress={backToWelcome}
                  className="mt-1 bg-transparent shadow-none active:opacity-80"
                  style={PILL_STYLE}
                >
                  <Text style={{ ...buttonLabel, color: COLORS.white }}>
                    {t("back")}
                  </Text>
                </Button>
              </>
            ) : (
              <>
                {/* Terms */}
                <Text style={{ ...legalText, textAlign: "center" }}>
                  {t("authWelcomeTermsPrefix", {
                    createAccount: t("authCreateAccountButton"),
                    signIn: t("authSignInButton"),
                  })}{" "}
                  <Link href="https://tulum-app.com/terms" asChild>
                    <Text accessibilityRole="link" style={legalLink}>
                      {t("authTermsOfService")}
                    </Text>
                  </Link>
                  . {t("authWelcomePrivacyPrefix")}{" "}
                  <Link href="https://tulum-app.com/privacy" asChild>
                    <Text accessibilityRole="link" style={legalLink}>
                      {t("authWelcomePrivacyPolicy")}
                    </Text>
                  </Link>
                  .
                </Text>

                <Button
                  onPress={() => choose("signUp")}
                  className="mt-6 bg-white active:opacity-80"
                  style={PILL_STYLE}
                >
                  <Text style={{ ...buttonLabel, color: COLORS.ink }}>
                    {t("authCreateAccountButton")}
                  </Text>
                </Button>

                <Button
                  onPress={() => choose("signIn")}
                  className="mt-2 bg-transparent shadow-none active:opacity-80"
                  style={PILL_STYLE}
                >
                  <Text style={{ ...buttonLabel, color: COLORS.white }}>
                    {t("authSignInButton")}
                  </Text>
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
