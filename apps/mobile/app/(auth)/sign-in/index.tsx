import Blob from "@/components/Blob";
import Logo from "@/components/illustrations/logo";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import * as WebBrowser from "expo-web-browser";
import { Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useClerk, useSSO } from "@clerk/expo";
import AppleIcon from "@/components/illustrations/apple-logo";
import GoogleIcon from "@/components/illustrations/google-icon";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner-native";

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

    const emailPrefix =
      signUp.emailAddress?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") ??
      "user";
    const suffix = Math.floor(1000 + Math.random() * 9000);

    const updatePayload: {
      username?: string;
      lastName?: string;
      password?: string;
    } = {};

    if (missing.includes("username")) {
      updatePayload.username = `${emailPrefix}${suffix}`.toLowerCase();
    }
    if (missing.includes("last_name")) {
      updatePayload.lastName = "User";
    }
    if (missing.includes("password")) {
      updatePayload.password = `Sso!${suffix}Tmp#${Date.now()}`;
    }

    const updatedSignUp = await signUp.update(updatePayload);
    const sessionId = updatedSignUp.createdSessionId ?? signUp.createdSessionId;

    if (sessionId) {
      await result.setActive({ session: sessionId });
      return true;
    }

    return false;
  };

  // const redirectUrl =
  //   Platform.OS === "web"
  //     ? `${window.location.origin}/onboarding`
  //     : Linking.createURL("/onboarding");

  const handleSSOSignIn = async (strategy: "oauth_apple" | "oauth_google") => {
    try {
      setFormError(null);

      const result = await startSSOFlow({
        strategy,
        // redirectUrl,
      });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace("/onboarding");
        return;
      }

      const didCompleteSignUp = await completeSsoSignUpIfNeeded(result);
      if (didCompleteSignUp) {
        router.replace("/onboarding");
      } else {
        setFormError(
          "We could not complete social sign in automatically. Continue with email or try sign up.",
        );
      }
    } catch (err) {
      console.error(`${strategy} sign-in error:`, err);
      setFormError(err instanceof Error ? err.message : "SSO sign in failed.");
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
        router.replace("/onboarding");
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
        router.replace("/onboarding");
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

  const Captcha = () => {
    if (Platform.OS !== "web") return null;

    return <div id="clerk-captcha" style={{ marginTop: 12 }} />;
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.backgroundFocus }}
    >
      <View className="flex-1 items-center justify-center px-6">
        <View className="absolute inset-0" pointerEvents="none">
          <Blob width="100%" color="rgba(255,255,255,0.10)" />
        </View>

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

        <Pressable
          onPress={() => handleSSOSignIn("oauth_apple")}
          className="flex-row items-center justify-center gap-3 rounded-2xl h-[54px] mb-3"
          style={{
            backgroundColor: theme.backgroundMuted,
            borderWidth: 1.5,
            borderColor: theme.backgroundMuted,
          }}
        >
          <AppleIcon fill={theme.gray10} />
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

        <Pressable
          onPress={() => handleSSOSignIn("oauth_google")}
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

        {/* <View className="flex-row items-center my-4">
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text
            style={{
              marginHorizontal: 12,
              fontSize: 13,
              color: theme.colorMuted,
            }}
          >
            or
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View> */}
        <Captcha />

        {/* <View className="mb-3"> */}

        {/* <Text
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
            style={{ backgroundColor: theme.primary }}
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
        </View> */}

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
