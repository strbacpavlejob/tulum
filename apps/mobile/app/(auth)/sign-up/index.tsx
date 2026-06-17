import Blob from "@/components/Blob";
import Logo from "@/components/illustrations/logo";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import * as WebBrowser from "expo-web-browser";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SignUp } from "@clerk/expo/web";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.backgroundFocus }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <SignUp
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
                cardBox: {
                  boxShadow: `0 0px 0px rgba(255, 255, 255, 0.00)`,
                  backgroundColor: "rgba(255, 255, 255, 0.00)", // Adjust the opacity as needed
                },
                headerTitle: { display: "none" },
                rootBox: "mx-auto w-full",
                card: {
                  paddingHorizontal: 0,
                  boxShadow: `0 0px 0px rgba(255, 255, 255, 0.00)`,
                  backgroundColor: "rgba(255, 255, 255, 0.00)", // Adjust the opacity as needed
                },
                lastAuthenticationStrategyBadge: {
                  backgroundColor: theme.backgroundMuted,
                  color: theme.colorStrong,
                },
                footerItem: { display: "none" },
                headerSubtitle: {
                  fontSize: "1rem",
                  color: theme.mutedForeground,
                },
                socialButtonsBlockButton: {
                  border: `1px solid ${theme.mutedForeground}`,
                  backgroundColor: theme.backgroundMuted,
                  color: theme.colorStrong,
                  height: 48,
                  fontSize: "0.875rem",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  display: "flex",
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
                  border: `1px solid ${theme.colorStrong}`,
                  backgroundColor: theme.backgroundMuted,
                  color: theme.cardForeground,
                },
                formFieldLabel: {
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: theme.colorStrong,
                },
                footerAction: { gap: 8 },
                footerActionText: {
                  color: theme.mutedForeground,
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
            path="/sign-up"
            signInUrl="/sign-in"
            routing="path"
            // forceRedirectUrl="/(auth)/onboarding"
            // fallbackRedirectUrl="/(auth)/onboarding"
            signInFallbackRedirectUrl="/(auth)/onboarding"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
