import LoadingIndicator from "@/components/loading-indicator";
import { Text } from "@/components/ui/text";
import { useClerk } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Captcha = () => {
  if (Platform.OS !== "web") return null;

  return <div id="clerk-captcha" style={{ marginTop: 12 }} />;
};

export default function SsoCallbackScreen() {
  const clerk = useClerk();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // const completeRedirect = async () => {
    //   try {
    //     await clerk.handleRedirectCallback({
    //       signInUrl: "/sign-in",
    //       signUpUrl: "/sign-up",
    //       signInFallbackRedirectUrl: "/(auth)/onboarding",
    //       signUpFallbackRedirectUrl: "/(auth)/onboarding",
    //     });
    //     if (!cancelled) {
    //       router.replace("/(auth)/onboarding");
    //     }
    //   } catch (err) {
    //     if (!cancelled) {
    //       setError(
    //         err instanceof Error ? err.message : "Failed to complete sign in.",
    //       );
    //     }
    //   }
    // };

    // void completeRedirect();

    return () => {
      cancelled = true;
    };
  }, [clerk, router]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <Captcha />
      <View className="flex-1 items-center justify-center px-6">
        <LoadingIndicator />
        <Text className="mt-3.5 text-center text-base text-light-cardForeground dark:text-dark-cardForeground">
          {error ?? "Completing sign in..."}
        </Text>
      </View>
    </SafeAreaView>
  );
}
