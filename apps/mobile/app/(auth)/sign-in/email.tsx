import ClerkCaptcha from "@/components/ClerkCaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { isRateLimited, retryOnRateLimit } from "@/lib/clerk-retry";
import { savePendingJoin } from "@/lib/pending-join";
import { generatedPassword, generatedUsername } from "@/lib/sign-up-fields";
import {
  isClerkAPIResponseError,
  useAuth,
  useSignIn,
  useSignUp,
} from "@clerk/expo";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Clerk's email codes have 6 digits. */
const CODE_LENGTH = 6;

/** The first error of a Clerk API answer: its code and the field it names. */
function firstClerkError(error: unknown) {
  if (!isClerkAPIResponseError(error)) return undefined;
  const first = error.errors[0];
  if (!first) return undefined;
  const meta = first.meta as { paramName?: string } | undefined;
  return {
    code: first.code,
    paramName: meta?.paramName,
    message: first.longMessage ?? first.message,
  };
}

/**
 * Email code sign-in, and sign-up for an address Clerk doesn't know: for
 * guests whose browser can't do Google (Instagram's, Facebook's) and anyone
 * without Google or Apple. The event to join rides along as on sign-in.
 */
export default function EmailCodeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const { join, src } = useLocalSearchParams<{ join?: string; src?: string }>();
  useEffect(() => {
    if (join) savePendingJoin(join, src);
  }, [join, src]);

  const [step, setStep] = useState<"email" | "code">("email");
  // A known address signs in; a new one signs up.
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [working, setWorking] = useState(false);
  // Clerk answered 429 and the call is waiting to go again.
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Set once the session is made here, so the signed-in check below
  // doesn't race finalize's own navigation.
  const finishingRef = useRef(false);
  useEffect(() => {
    if (isAuthLoaded && isSignedIn && !finishingRef.current) {
      router.replace("/");
    }
  }, [isAuthLoaded, isSignedIn, router]);

  const showWaiting = () => setWaiting(true);

  const messageFor = (refusal: unknown): string => {
    if (isRateLimited(refusal)) return t("authBusyLater");
    const first = firstClerkError(refusal);
    switch (first?.code) {
      case "form_code_incorrect":
        return t("authInvalidCode");
      case "verification_expired":
      case "verification_failed":
        return t("authCodeExpired");
      case "form_param_format_invalid":
      case "form_param_nil":
        if (
          first.paramName === "email_address" ||
          first.paramName === "identifier"
        ) {
          return t("authEmailInvalid");
        }
        break;
    }
    return first?.message ?? t("authSignInFailed");
  };

  // The instance makes a username and a password required; the app fills
  // them in. If Clerk refuses one (a username taken, or a field turned off
  // in the dashboard), it is made again or left out.
  const createSignUp = async (emailAddress: string) => {
    let fields: { username?: string; password?: string } = {
      username: generatedUsername(emailAddress),
      password: generatedPassword(),
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const created = await retryOnRateLimit(
        () => signUp.create({ emailAddress, ...fields }),
        showWaiting,
      );
      if (!created.error) return null;
      const first = firstClerkError(created.error);
      if (
        first?.code === "form_identifier_exists" &&
        first.paramName === "username"
      ) {
        fields = { ...fields, username: generatedUsername(emailAddress) };
      } else if (first?.paramName === "password" && fields.password) {
        fields = { username: fields.username };
      } else if (first?.paramName === "username" && fields.username) {
        fields = { password: fields.password };
      } else {
        return created.error;
      }
    }
    return null;
  };

  const sendCode = async () => {
    const emailAddress = email.trim();
    if (!emailAddress) return;
    setError(null);
    setNotice(null);
    setWorking(true);
    try {
      const sent = await retryOnRateLimit(
        () => signIn.emailCode.sendCode({ emailAddress }),
        showWaiting,
      );
      if (!sent.error) {
        setMode("signIn");
        setStep("code");
        return;
      }
      if (firstClerkError(sent.error)?.code !== "form_identifier_not_found") {
        setError(messageFor(sent.error));
        return;
      }

      // A new guest: a sign-up, verified with the same kind of code.
      const refused = await createSignUp(emailAddress);
      if (refused) {
        setError(messageFor(refused));
        return;
      }
      const mailed = await retryOnRateLimit(
        () => signUp.verifications.sendEmailCode(),
        showWaiting,
      );
      if (mailed.error) {
        setError(messageFor(mailed.error));
        return;
      }
      setMode("signUp");
      setStep("code");
    } finally {
      setWaiting(false);
      setWorking(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setNotice(null);
    setWorking(true);
    try {
      const sent = await retryOnRateLimit(
        () =>
          mode === "signIn"
            ? signIn.emailCode.sendCode()
            : signUp.verifications.sendEmailCode(),
        showWaiting,
      );
      if (sent.error) setError(messageFor(sent.error));
      else setNotice(t("authCodeResent"));
    } finally {
      setWaiting(false);
      setWorking(false);
    }
  };

  // After the session is set: onboarding, which sends a guest whose profile
  // is done home, to the event they came to join.
  const goToOnboarding = async ({
    decorateUrl,
  }: {
    decorateUrl: (url: string) => string;
  }) => {
    const url = decorateUrl("/onboarding");
    if (url.startsWith("http")) window.location.href = url;
    else router.replace(url as Href);
  };

  // The name fields Clerk still needs from a new guest.
  const needsFirstName =
    mode === "signUp" && signUp.missingFields.includes("first_name");
  const needsLastName =
    mode === "signUp" && signUp.missingFields.includes("last_name");

  const verifyCode = async () => {
    setError(null);
    setNotice(null);
    setWorking(true);
    try {
      if (mode === "signIn") {
        const checked = await retryOnRateLimit(
          () => signIn.emailCode.verifyCode({ code: code.trim() }),
          showWaiting,
        );
        if (checked.error) {
          setError(messageFor(checked.error));
          return;
        }
        if (signIn.status !== "complete") {
          setError(t("authSignInFailed"));
          return;
        }
        finishingRef.current = true;
        const done = await signIn.finalize({ navigate: goToOnboarding });
        if (done.error) {
          finishingRef.current = false;
          setError(messageFor(done.error));
        }
        return;
      }

      if (needsFirstName || needsLastName) {
        const named = await retryOnRateLimit(
          () =>
            signUp.update({
              ...(needsFirstName ? { firstName: firstName.trim() } : {}),
              ...(needsLastName ? { lastName: lastName.trim() } : {}),
            }),
          showWaiting,
        );
        if (named.error) {
          setError(messageFor(named.error));
          return;
        }
      }
      const checked = await retryOnRateLimit(
        () => signUp.verifications.verifyEmailCode({ code: code.trim() }),
        showWaiting,
      );
      if (checked.error) {
        setError(messageFor(checked.error));
        return;
      }
      if (signUp.status !== "complete") {
        setError(t("authSignInFailed"));
        return;
      }
      finishingRef.current = true;
      const done = await signUp.finalize({ navigate: goToOnboarding });
      if (done.error) {
        finishingRef.current = false;
        setError(messageFor(done.error));
      }
    } finally {
      setWaiting(false);
      setWorking(false);
    }
  };

  const startOver = () => {
    setStep("email");
    setCode("");
    setError(null);
    setNotice(null);
  };

  const goBack = () => {
    if (step === "code") {
      startOver();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(auth)/sign-in",
        params: join ? { join, ...(src ? { src } : {}) } : {},
      });
    }
  };

  const canSubmit =
    !working &&
    (step === "email"
      ? /\S+@\S+\.\S+/.test(email.trim())
      : code.trim().length === CODE_LENGTH &&
        (!needsFirstName || firstName.trim().length > 0) &&
        (!needsLastName || lastName.trim().length > 0));

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            className="mb-6 h-9 w-9 items-center justify-center rounded-full bg-light-backgroundMuted dark:bg-dark-backgroundMuted"
          >
            <ArrowLeft size={18} color={theme.colorStrong} />
          </Pressable>

          <Text
            className="mb-1.5 text-light-colorStrong dark:text-dark-colorStrong"
            style={{
              fontFamily: "Fredoka_700Bold",
              fontSize: 26,
              lineHeight: 34,
            }}
          >
            {step === "email" ? t("authContinueWithEmail") : t("authCodeTitle")}
          </Text>
          <Text
            className="mb-6 text-light-colorMuted dark:text-dark-colorMuted"
            style={{ fontFamily: "Fredoka_500Medium", fontSize: 15 }}
          >
            {step === "email"
              ? t("authEmailSubtitle")
              : t("authCodeSubtitle", { email: email.trim() })}
          </Text>

          {step === "email" ? (
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              inputMode="email"
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={() => canSubmit && void sendCode()}
              className="mb-4 rounded-xl px-4 py-3 text-lg"
            />
          ) : (
            <View className="mb-4 gap-3">
              {needsFirstName && (
                <Input
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t("authFirstName")}
                  autoComplete="given-name"
                  autoCapitalize="words"
                  className="rounded-xl px-4 py-3 text-lg"
                />
              )}
              {needsLastName && (
                <Input
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t("authLastName")}
                  autoComplete="family-name"
                  autoCapitalize="words"
                  className="rounded-xl px-4 py-3 text-lg"
                />
              )}
              <Input
                value={code}
                onChangeText={(text) =>
                  setCode(text.replace(/\D/g, "").slice(0, CODE_LENGTH))
                }
                placeholder="123456"
                inputMode="numeric"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={CODE_LENGTH}
                autoFocus={!needsFirstName}
                onSubmitEditing={() => canSubmit && void verifyCode()}
                className="rounded-xl px-4 py-3 text-lg tracking-[6px]"
              />
            </View>
          )}

          {waiting && (
            <Text className="mb-3 text-center text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
              {t("authBusyRetrying")}
            </Text>
          )}
          {error && (
            <Text className="mb-3 text-center text-[13px] text-red-500">
              {error}
            </Text>
          )}
          {notice && !error && (
            <Text className="mb-3 text-center text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
              {notice}
            </Text>
          )}

          <Button
            onPress={() => void (step === "email" ? sendCode() : verifyCode())}
            disabled={!canSubmit}
            className="h-14 w-full rounded-full bg-light-color dark:bg-dark-color"
            style={
              canSubmit
                ? { borderRadius: 999 }
                : { opacity: 0.45, borderRadius: 999 }
            }
          >
            {working ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">
                {step === "email" ? t("authSendCode") : t("authVerifyCode")}
              </Text>
            )}
          </Button>

          {step === "code" && (
            <View className="mt-5 flex-row justify-between">
              <Pressable
                onPress={() => void resendCode()}
                disabled={working}
                hitSlop={8}
              >
                <Text className="text-sm text-light-color dark:text-dark-color">
                  {t("authResendCode")}
                </Text>
              </Pressable>
              <Pressable onPress={startOver} disabled={working} hitSlop={8}>
                <Text className="text-sm text-light-color dark:text-dark-color">
                  {t("authUseDifferentEmail")}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Clerk's bot check for sign-ups renders here on web. */}
          <ClerkCaptcha />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
