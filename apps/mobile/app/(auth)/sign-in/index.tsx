import Blob from "@/components/Blob";
import Logo from "@/components/illustrations/logo";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import * as WebBrowser from "expo-web-browser";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useClerk, useSSO } from "@clerk/expo";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import { useState } from "react";
import { Button } from "@/components/ui/button";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clerk = useClerk();
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

  const handleIdentifierContinue = async () => {
    const cleanedIdentifier = identifier.trim();

    if (!cleanedIdentifier) {
      setFormError("Enter your email or username.");
      return;
    }

    if (!clerk.loaded || !clerk.client?.signIn) {
      setFormError("Sign in is still loading. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      setOtpCode("");

      const signInAttempt = (await clerk.client.signIn.create({
        identifier: cleanedIdentifier,
      })) as {
        createdSessionId?: string | null;
        status?: string | null;
        supportedFirstFactors?: (
          | {
              strategy?: string;
              emailAddressId?: string;
              email_address_id?: string;
            }
          | null
          | undefined
        )[];
        prepareFirstFactor?: (params: {
          strategy: "email_code";
          emailAddressId: string;
        }) => Promise<unknown>;
      };

      if (signInAttempt.createdSessionId) {
        await clerk.setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(auth)/onboarding");
        return;
      }

      if (signInAttempt.status === "needs_first_factor") {
        const emailCodeFactor = signInAttempt.supportedFirstFactors?.find(
          (factor) => factor?.strategy === "email_code",
        );

        const emailAddressId =
          emailCodeFactor?.emailAddressId ?? emailCodeFactor?.email_address_id;

        if (emailAddressId && signInAttempt.prepareFirstFactor) {
          await signInAttempt.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId,
          });
          setIsOtpStep(true);
          setFormError(null);
          return;
        }
      }

      setFormError(
        "Continue with your next verification step to finish sign in.",
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to continue sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpContinue = async () => {
    const cleanedCode = otpCode.trim();

    if (!cleanedCode) {
      setFormError("Enter the one-time password sent to your email.");
      return;
    }

    if (!clerk.loaded || !clerk.client?.signIn) {
      setFormError("Sign in is still loading. Please try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const result = (await clerk.client.signIn.attemptFirstFactor({
        strategy: "email_code",
        code: cleanedCode,
      })) as {
        createdSessionId?: string | null;
        status?: string | null;
      };

      if (result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        router.replace("/(auth)/onboarding");
        return;
      }

      if (result.status === "needs_second_factor") {
        setFormError("A second verification step is required.");
        return;
      }

      setFormError("Invalid code. Please try again.");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to verify code.",
      );
    } finally {
      setIsSubmitting(false);
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

        <View className="flex-row items-center my-4">
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.border,
            }}
          />
          <Text
            style={{
              marginHorizontal: 12,
              fontSize: 13,
              color: theme.colorMuted,
            }}
          >
            or
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: theme.border,
            }}
          />
        </View>

        {/* Identifier / OTP step */}
        <View className="mb-3">
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: theme.colorMuted,
              marginBottom: 8,
            }}
          >
            {isOtpStep ? "One-time password" : "Email or username"}
          </Text>
          <Input
            value={isOtpStep ? otpCode : identifier}
            onChangeText={isOtpStep ? setOtpCode : setIdentifier}
            onSubmitEditing={
              isOtpStep ? handleOtpContinue : handleIdentifierContinue
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={isOtpStep ? "number-pad" : "email-address"}
            placeholder={
              isOtpStep
                ? "Enter the code from your email"
                : "Enter email or username"
            }
            placeholderTextColor={theme.colorMuted}
            className="h-[54px] rounded-2xl"
            style={{
              backgroundColor: theme.backgroundMuted,
              borderWidth: 1.5,
              borderColor: theme.backgroundMuted,
              color: theme.colorStrong,
            }}
          />
          <Button
            onPress={isOtpStep ? handleOtpContinue : handleIdentifierContinue}
            disabled={isSubmitting || !clerk.loaded}
            className="rounded-2xl h-[54px] mt-3"
            style={{
              backgroundColor: theme.primary,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: theme.primaryForeground,
              }}
            >
              {isSubmitting ? "Continuing..." : "Continue"}
            </Text>
          </Button>
          {isOtpStep ? (
            <Pressable
              onPress={() => {
                setIsOtpStep(false);
                setOtpCode("");
                setFormError(null);
              }}
              className="items-center mt-3"
            >
              <Text style={{ color: theme.colorMuted, fontSize: 13 }}>
                Use a different email or username
              </Text>
            </Pressable>
          ) : null}
          {formError ? (
            <Text
              style={{
                marginTop: 8,
                fontSize: 13,
                color: theme.destructive,
              }}
            >
              {formError}
            </Text>
          ) : null}
        </View>

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
