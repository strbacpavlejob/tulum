import Blob from "@/components/Blob";
import Logo from "@/components/illustrations/logo";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import * as WebBrowser from "expo-web-browser";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSSO } from "@clerk/expo";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import { Mail } from "lucide-react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
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
      className="flex-1 bg-light-backgroundFocus dark:bg-dark-backgroundFocus"
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

      {/* ── Sign-up card ──────────────────────────────────────────────── */}
      <View className="rounded-t-[32px] bg-light-background px-6 pt-8 pb-6 dark:bg-dark-background">
        <Text className="mb-1.5 text-[22px] font-bold text-light-colorStrong dark:text-dark-colorStrong">
          Sign up to continue
        </Text>
        <Text className="mb-6 text-sm text-light-colorMuted dark:text-dark-colorMuted">
          {"Choose how you'd like to join"}
        </Text>

        {/* Apple */}
        <Pressable
          onPress={handleAppleSignIn}
          className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
        >
          <AppleIcon />
          <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
            Continue with Apple
          </Text>
        </Pressable>

        {/* Google */}
        <Pressable
          onPress={handleGoogleSignIn}
          className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
        >
          <GoogleIcon />
          <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
            Continue with Google
          </Text>
        </Pressable>

        {/* Email */}
        <Button
          variant="outline"
          onPress={() => router.push("/(auth)/sign-in" as any)}
          className="mb-3 h-[54px] flex-row items-center justify-center gap-3 rounded-2xl border-[1.5px] border-light-backgroundMuted bg-light-backgroundMuted dark:border-dark-backgroundMuted dark:bg-dark-backgroundMuted"
        >
          <Mail size={20} color={theme.color} />
          <Text className="text-base font-semibold text-light-colorStrong dark:text-dark-colorStrong">
            Continue with Email
          </Text>
        </Button>

        <Text className="mt-5 text-center leading-[18px] text-light-colorMuted dark:text-dark-colorMuted">
          By continuing, you agree to our{" "}
          <Text className="text-light-color dark:text-dark-color">
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text className="text-light-color dark:text-dark-color">
            Privacy Policy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
