import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SsoCallbackScreen() {
  const theme = useAppTheme();
  const clerk = useClerk();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const completeRedirect = async () => {
      try {
        await clerk.handleRedirectCallback({
          signInUrl: "/sign-in",
          signUpUrl: "/sign-up",
          signInFallbackRedirectUrl: "/(auth)/onboarding",
          signUpFallbackRedirectUrl: "/(auth)/onboarding",
        });
        if (!cancelled) {
          router.replace("/(auth)/onboarding");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to complete sign in.",
          );
        }
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
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color={theme.primary} />
        <Text
          style={{
            marginTop: 14,
            color: theme.cardForeground,
            textAlign: "center",
            fontSize: 16,
          }}
        >
          {error ?? "Completing sign in..."}
        </Text>
      </View>
    </SafeAreaView>
  );
}
