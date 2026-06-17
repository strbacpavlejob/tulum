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
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colorStrong,
            marginBottom: 6,
          }}
        >
          Sign in to continue
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: theme.colorMuted,
            marginBottom: 24,
          }}
        >
          {"Choose how you'd like to join"}
        </Text>

        {/* Apple */}
        <Pressable
          onPress={handleAppleSignIn}
          className="flex-row items-center justify-center gap-3 rounded-2xl h-[54px] mb-3"
          style={{
            backgroundColor: theme.backgroundMuted,
            borderWidth: 1.5,
            borderColor: theme.backgroundMuted,
          }}
        >
          <AppleIcon />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colorStrong,
            }}
          >
            Continue with Apple
          </Text>
        </Pressable>

        {/* Google */}
        <Pressable
          onPress={handleGoogleSignIn}
          className="flex-row items-center justify-center gap-3 rounded-2xl h-[54px] mb-3"
          style={{
            backgroundColor: theme.backgroundMuted,
            borderWidth: 1.5,
            borderColor: theme.backgroundMuted,
          }}
        >
          <GoogleIcon />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colorStrong,
            }}
          >
            Continue with Google
          </Text>
        </Pressable>

        {/* Email */}
        <Button
          variant="outline"
          onPress={() => router.push("/(auth)/sign-in" as any)}
          className="flex-row items-center justify-center gap-3 rounded-2xl h-[54px] mb-3"
          style={{
            backgroundColor: theme.backgroundMuted,
            borderWidth: 1.5,
            borderColor: theme.backgroundMuted,
          }}
        >
          <Mail size={20} color={theme.color} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: theme.colorStrong,
            }}
          >
            Continue with Email
          </Text>
        </Button>

        <Text
          style={{
            color: theme.colorMuted,
            textAlign: "center",
            marginTop: 20,
            lineHeight: 18,
          }}
        >
          By continuing, you agree to our{" "}
          <Text style={{ color: theme.color }}>Terms of Service</Text> and{" "}
          <Text style={{ color: theme.color }}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
