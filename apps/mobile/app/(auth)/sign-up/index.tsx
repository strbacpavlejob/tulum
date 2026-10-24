import ClerkCaptcha from "@/components/ClerkCaptcha";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";

import { useSSO } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

const welcomeIllustration = require("@/assets/images/tulum-welcome.webp");

export default function SignUpScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const { startSSOFlow } = useSSO();
  const [loadingProvider, setLoadingProvider] = useState<
    "apple" | "google" | null
  >(null);

  const redirectUrl = Linking.createURL("/(auth)/sso-callback");

  const handleSSO = async (provider: "apple" | "google") => {
    if (loadingProvider) return;

    setLoadingProvider(provider);

    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider === "apple" ? "oauth_apple" : "oauth_google",
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(auth)/onboarding");
      }
    } catch (err) {
      console.error(`${provider} sign-in error:`, err);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-backgroundFocus dark:bg-dark-backgroundFocus"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero illustration */}
        <View
          className="relative min-h-[260px] flex-1 overflow-hidden"
          style={{ backgroundColor: "#6330F5" }}
        >
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

          {/* Optional subtle bottom fade */}
          <View
            pointerEvents="none"
            className="absolute bottom-0 left-0 right-0 h-5"
            style={{
              backgroundColor: "rgba(0,0,0,0.04)",
            }}
          />
        </View>

        {/* Sign-up card */}
        <View className="rounded-t-[32px] bg-light-background px-6 pb-6 pt-8 dark:bg-dark-background">
          <Text className="mb-1.5 text-[22px] font-bold text-light-colorStrong dark:text-dark-colorStrong">
            Sign up to continue
          </Text>

          <Text className="mb-6 text-sm text-light-colorMuted dark:text-dark-colorMuted">
            Choose how you'd like to join
          </Text>

          {/* Apple */}
          <Button
            disabled={loadingProvider !== null}
            onPress={() => handleSSO("apple")}
            className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
          >
            {loadingProvider === "apple" ? (
              <ActivityIndicator color={theme.color} />
            ) : (
              <AppleIcon />
            )}
            <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
              Continue with Apple
            </Text>
          </Button>

          {/* Google */}
          <Button
            disabled={loadingProvider !== null}
            onPress={() => handleSSO("google")}
            className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
          >
            {loadingProvider === "google" ? (
              <ActivityIndicator color={theme.color} />
            ) : (
              <GoogleIcon />
            )}
            <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
              Continue with Google
            </Text>
          </Button>

          {/* Legal */}
          <Text className="mt-5 text-center leading-[18px] text-light-colorMuted dark:text-dark-colorMuted">
            By continuing, you agree to our{" "}
            <Link href="https://tulum-app.com/terms" asChild>
              <Text
                accessibilityRole="link"
                className="text-light-color underline dark:text-dark-color"
              >
                Terms of Service
              </Text>
            </Link>{" "}
            and{" "}
            <Link href="https://tulum-app.com/privacy" asChild>
              <Text
                accessibilityRole="link"
                className="text-light-color underline dark:text-dark-color"
              >
                Privacy Policy
              </Text>
            </Link>
          </Text>

          <ClerkCaptcha />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
