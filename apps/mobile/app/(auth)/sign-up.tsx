import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(auth)/onboarding");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Invalid code. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="px-4 pt-2 pb-4">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-2 self-start py-2"
          >
            <ArrowLeft size={20} color={theme.colorMuted} />
            <Text style={{ color: theme.colorMuted, fontSize: 14 }}>Back</Text>
          </Pressable>
        </View>

        <View className="flex-1 px-6">
          {!pendingVerification ? (
            <>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: theme.colorStrong,
                  marginBottom: 6,
                }}
              >
                Create account
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colorMuted,
                  marginBottom: 32,
                }}
              >
                Sign up with your email and a password
              </Text>

              {/* Email */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colorStrong,
                  marginBottom: 6,
                }}
              >
                Email address
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={theme.colorMuted}
                style={{
                  height: 52,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: theme.colorStrong,
                  backgroundColor: theme.backgroundCard,
                  marginBottom: 16,
                }}
              />

              {/* Password */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colorStrong,
                  marginBottom: 6,
                }}
              >
                Password
              </Text>
              <View style={{ position: "relative", marginBottom: 8 }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Create a password"
                  placeholderTextColor={theme.colorMuted}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    paddingHorizontal: 16,
                    paddingRight: 48,
                    fontSize: 15,
                    color: theme.colorStrong,
                    backgroundColor: theme.backgroundCard,
                  }}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 14, top: 14 }}
                >
                  {showPassword ? (
                    <EyeOff size={22} color={theme.colorMuted} />
                  ) : (
                    <Eye size={22} color={theme.colorMuted} />
                  )}
                </Pressable>
              </View>

              {error && (
                <Text
                  style={{ color: "#e7000b", fontSize: 13, marginBottom: 16 }}
                >
                  {error}
                </Text>
              )}

              <Button
                onPress={handleSignUp}
                disabled={!email || !password || loading}
                className="h-[54px] rounded-2xl mt-4"
                style={{ backgroundColor: theme.color }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}
                  >
                    Continue
                  </Text>
                )}
              </Button>

              <View className="flex-row items-center justify-center mt-6 gap-1">
                <Text style={{ color: theme.colorMuted, fontSize: 14 }}>
                  Already have an account?
                </Text>
                <Pressable onPress={() => router.push("/(auth)/sign-in")}>
                  <Text
                    style={{
                      color: theme.color,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Sign in
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: theme.colorStrong,
                  marginBottom: 6,
                }}
              >
                Check your email
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colorMuted,
                  marginBottom: 32,
                }}
              >
                We sent a 6-digit code to {email}
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colorStrong,
                  marginBottom: 6,
                }}
              >
                Verification code
              </Text>
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                placeholder="123456"
                placeholderTextColor={theme.colorMuted}
                maxLength={6}
                style={{
                  height: 52,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  fontSize: 22,
                  letterSpacing: 6,
                  color: theme.colorStrong,
                  backgroundColor: theme.backgroundCard,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              />

              {error && (
                <Text
                  style={{ color: "#e7000b", fontSize: 13, marginBottom: 16 }}
                >
                  {error}
                </Text>
              )}

              <Button
                onPress={handleVerify}
                disabled={verificationCode.length < 6 || loading}
                className="h-[54px] rounded-2xl mt-4"
                style={{ backgroundColor: theme.color }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}
                  >
                    Verify email
                  </Text>
                )}
              </Button>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
