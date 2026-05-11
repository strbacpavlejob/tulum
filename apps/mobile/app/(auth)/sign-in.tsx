import Blob from "@/components/Blob";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import Logo from "@/components/illustrations/logo";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSSO } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignIn } from "@clerk/expo/web";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const { startSSOFlow } = useSSO();

  const handleAppleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(auth)/onboarding");
      }
    } catch (err) {
      console.error("Apple sign-in error:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/(auth)/onboarding");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.backgroundFocus }}
    >
      {/* ── Brand section ─────────────────────────────────────────────── */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Blob decoration */}
        <View className="absolute inset-0" pointerEvents="none">
          <Blob width="100%" color="rgba(255,255,255,0.10)" />
        </View>

        {/* Logo circle */}
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
          Meet people at events near you
        </Text>
      </View>

      {/* ── Sign-in card ──────────────────────────────────────────────── */}
      <View
        className="rounded-t-[32px] px-6 pt-8 pb-6"
        style={{ backgroundColor: theme.background }}
      >
        <SignIn
          appearance={{
            variables: {
              colorPrimary: theme.primary,
              colorBackground: theme.card,
              colorText: theme.cardForeground,
              colorTextSecondary: theme.mutedForeground,
              colorInputBackground: theme.background,
              colorInputText: theme.cardForeground,
              borderRadius: "0.5rem",
            },
            elements: {
              headerTitle: { display: "none" },
              rootBox: "mx-auto w-full",
              card: { boxShadow: `0 4px 24px ${theme.shadowStrong}` },
              headerSubtitle: {
                fontSize: "0.875rem",
                color: theme.mutedForeground,
              },
              socialButtonsBlockButton: {
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.colorStrong,
              },
              socialButtonsBlockButtonText: {
                fontWeight: "400",
                color: theme.colorStrong,
              },
              formButtonPrimary: {
                backgroundColor: theme.primary,
                color: theme.primaryForeground,
                textTransform: "none",
              },
              formFieldInput: {
                border: `1px solid ${theme.input}`,
                backgroundColor: theme.background,
                color: theme.cardForeground,
              },
              formFieldLabel: {
                fontSize: "0.875rem",
                fontWeight: "500",
                color: theme.colorStrong,
              },
              footerActionLink: { color: theme.primary },
              identityPreviewEditButton: { color: theme.primary },
              formFieldInputShowPasswordButton: { color: theme.colorMuted },
              dividerLine: { backgroundColor: theme.border },
              dividerText: {
                fontSize: "0.75rem",
                color: theme.mutedForeground,
              },
              otpCodeFieldInput: {
                border: `1px solid ${theme.input}`,
                backgroundColor: theme.background,
              },
              formResendCodeLink: { color: theme.primary },
              formFieldError: {
                fontSize: "0.875rem",
                color: theme.destructive,
              },
            },
            options: {
              logoImageUrl: undefined,
              logoPlacement: "none",
            },
          }}
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </View>
    </SafeAreaView>
  );
}
