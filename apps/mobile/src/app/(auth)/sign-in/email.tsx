import ClerkCaptcha from "@/components/clerk-captcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { isRateLimited, retryOnRateLimit } from "@/lib/clerk-retry";
import { savePendingJoin } from "@/lib/pending-join";
import { generatedUsername } from "@/lib/sign-up-fields";
import {
  isClerkAPIResponseError,
  useAuth,
  useSignIn,
  useSignUp,
} from "@clerk/expo";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
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
/** The shortest password Clerk takes (its default; the instance sets none). */
const MIN_PASSWORD_LENGTH = 8;

/**
 * The screen's steps: signing in, signing up, the code that confirms a new
 * account's email (with any name Clerk still needs), the code Clerk asks for
 * when an account signs in on a new device (Device Trust), and the two steps
 * of a password reset.
 */
type Step =
  | "signIn"
  | "signUp"
  | "signUpCode"
  | "deviceCode"
  | "resetEmail"
  | "resetCode";

/** Where the back arrow and "Use a different email" go from each step. */
const PREVIOUS_STEP: Partial<Record<Step, Step>> = {
  signUp: "signIn",
  signUpCode: "signUp",
  deviceCode: "signIn",
  resetEmail: "signIn",
  resetCode: "resetEmail",
};

const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

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
 * Email and password: sign-in, sign-up (the address confirmed with a code)
 * and a password reset by code. For guests whose browser can't do Google
 * (Instagram's, Facebook's) and anyone without Google. The event to join
 * rides along as on sign-in.
 */
export default function EmailSignInScreen() {
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

  const [step, setStep] = useState<Step>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const goTo = (next: Step) => {
    setStep(next);
    setCode("");
    setError(null);
    setNotice(null);
  };

  const messageFor = (refusal: unknown): string => {
    if (isRateLimited(refusal)) return t("authBusyLater");
    const first = firstClerkError(refusal);
    switch (first?.code) {
      case "form_code_incorrect":
        return t("authInvalidCode");
      case "verification_expired":
      case "verification_failed":
        return t("authCodeExpired");
      case "form_password_incorrect":
        return t("authWrongPassword");
      case "form_identifier_not_found":
        return t("authNoAccount");
      case "form_identifier_exists":
        if (first.paramName === "email_address") return t("authEmailTaken");
        break;
      case "form_password_pwned":
        // On sign-in, Clerk refuses a leaked password until it is reset.
        return step === "signIn"
          ? t("authPasswordPwnedSignIn")
          : t("authPasswordPwned");
      case "form_password_length_too_short":
        return t("authPasswordTooShort");
      case "strategy_for_user_invalid":
        // An account made with Google has no password to sign in with.
        return t("authNoPasswordYet");
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

  const finishSignIn = async () => {
    finishingRef.current = true;
    const done = await signIn.finalize({ navigate: goToOnboarding });
    if (done.error) {
      finishingRef.current = false;
      setError(messageFor(done.error));
    }
  };

  const finishSignUp = async () => {
    finishingRef.current = true;
    const done = await signUp.finalize({ navigate: goToOnboarding });
    if (done.error) {
      finishingRef.current = false;
      setError(messageFor(done.error));
    }
  };

  const signInWithPassword = async () => {
    const signedIn = await retryOnRateLimit(
      () => signIn.password({ identifier: email.trim(), password }),
      showWaiting,
    );
    if (signedIn.error) {
      setError(messageFor(signedIn.error));
      return;
    }
    // A known account on a device Clerk hasn't seen: it mails a code first.
    if (signIn.status === "needs_client_trust") {
      const sent = await retryOnRateLimit(
        () => signIn.mfa.sendEmailCode(),
        showWaiting,
      );
      if (sent.error) {
        setError(messageFor(sent.error));
        return;
      }
      goTo("deviceCode");
      return;
    }
    if (signIn.status !== "complete") {
      setError(t("authSignInFailed"));
      return;
    }
    await finishSignIn();
  };

  const verifyDeviceCode = async () => {
    const checked = await retryOnRateLimit(
      () => signIn.mfa.verifyEmailCode({ code: code.trim() }),
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
    await finishSignIn();
  };

  // The instance requires a username, which the app makes up: again if it
  // is taken, and none if the field is turned off in the dashboard. The
  // guest's own password goes as typed; Clerk's refusals of it are shown.
  const createSignUp = async (emailAddress: string) => {
    let username: string | undefined = generatedUsername(emailAddress);
    for (let attempt = 1; ; attempt += 1) {
      const created = await retryOnRateLimit(
        () =>
          signUp.create({
            emailAddress,
            password,
            ...(username ? { username } : {}),
          }),
        showWaiting,
      );
      if (!created.error) return null;
      const first = firstClerkError(created.error);
      if (first?.paramName !== "username" || !username || attempt >= 3) {
        return created.error;
      }
      username =
        first.code === "form_identifier_exists"
          ? generatedUsername(emailAddress)
          : undefined;
    }
  };

  const createAccount = async () => {
    const refused = await createSignUp(email.trim());
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
    goTo("signUpCode");
  };

  // The name fields Clerk still needs from a new guest.
  const needsFirstName =
    step === "signUpCode" && signUp.missingFields.includes("first_name");
  const needsLastName =
    step === "signUpCode" && signUp.missingFields.includes("last_name");

  const verifySignUpCode = async () => {
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
    await finishSignUp();
  };

  const sendResetCode = async () => {
    const started = await retryOnRateLimit(
      () => signIn.create({ identifier: email.trim() }),
      showWaiting,
    );
    if (started.error) {
      setError(messageFor(started.error));
      return;
    }
    const sent = await retryOnRateLimit(
      () => signIn.resetPasswordEmailCode.sendCode(),
      showWaiting,
    );
    if (sent.error) {
      setError(messageFor(sent.error));
      return;
    }
    setPassword("");
    goTo("resetCode");
  };

  const resetPassword = async () => {
    // A code Clerk already took (and a new password it then refused) isn't
    // checked again.
    if (signIn.status !== "needs_new_password") {
      const checked = await retryOnRateLimit(
        () => signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }),
        showWaiting,
      );
      if (checked.error) {
        setError(messageFor(checked.error));
        return;
      }
    }
    const saved = await retryOnRateLimit(
      () => signIn.resetPasswordEmailCode.submitPassword({ password }),
      showWaiting,
    );
    if (saved.error) {
      setError(messageFor(saved.error));
      return;
    }
    if (signIn.status !== "complete") {
      setError(t("authSignInFailed"));
      return;
    }
    await finishSignIn();
  };

  const stepActions: Record<Step, () => Promise<void>> = {
    signIn: signInWithPassword,
    signUp: createAccount,
    signUpCode: verifySignUpCode,
    deviceCode: verifyDeviceCode,
    resetEmail: sendResetCode,
    resetCode: resetPassword,
  };

  // Runs a step's Clerk calls with the screen busy.
  const run = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setWorking(true);
    try {
      await action();
    } finally {
      setWaiting(false);
      setWorking(false);
    }
  };

  const submit = () => run(stepActions[step]);

  const resendCode = () =>
    run(async () => {
      const sent = await retryOnRateLimit(
        () =>
          step === "signUpCode"
            ? signUp.verifications.sendEmailCode()
            : step === "deviceCode"
              ? signIn.mfa.sendEmailCode()
              : signIn.resetPasswordEmailCode.sendCode(),
        showWaiting,
      );
      if (sent.error) setError(messageFor(sent.error));
      else setNotice(t("authCodeResent"));
    });

  const goBack = () => {
    const previous = PREVIOUS_STEP[step];
    if (previous) {
      goTo(previous);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(auth)/sign-in",
        params: join ? { join, ...(src ? { src } : {}) } : {},
      });
    }
  };

  const showsEmail =
    step === "signIn" || step === "signUp" || step === "resetEmail";
  const showsPassword =
    step === "signIn" || step === "signUp" || step === "resetCode";
  const showsCode =
    step === "signUpCode" || step === "deviceCode" || step === "resetCode";
  const choosesPassword = step === "signUp" || step === "resetCode";

  const codeEntered = code.trim().length === CODE_LENGTH;
  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const ready: Record<Step, boolean> = {
    signIn: isEmail(email) && password.length > 0,
    signUp: isEmail(email) && passwordLongEnough,
    signUpCode:
      codeEntered &&
      (!needsFirstName || firstName.trim().length > 0) &&
      (!needsLastName || lastName.trim().length > 0),
    deviceCode: codeEntered,
    resetEmail: isEmail(email),
    resetCode: codeEntered && passwordLongEnough,
  };
  const canSubmit = !working && ready[step];
  const submitIfReady = () => {
    if (canSubmit) void submit();
  };

  const titles: Record<Step, string> = {
    signIn: t("authEmailSignInTitle"),
    signUp: t("authCreateAccountTitle"),
    signUpCode: t("authCodeTitle"),
    deviceCode: t("authCodeTitle"),
    resetEmail: t("authResetTitle"),
    resetCode: t("authResetTitle"),
  };
  const subtitles: Record<Step, string> = {
    signIn: t("authEmailSubtitle"),
    signUp: t("authCreateAccountSubtitle"),
    signUpCode: t("authCodeSubtitle", { email: email.trim() }),
    deviceCode: t("authDeviceCodeSubtitle", { email: email.trim() }),
    resetEmail: t("authResetSubtitle"),
    resetCode: t("authResetCodeSubtitle", { email: email.trim() }),
  };
  const buttonLabels: Record<Step, string> = {
    signIn: t("authSignInButton"),
    signUp: t("authCreateAccountButton"),
    signUpCode: t("authVerifyCode"),
    deviceCode: t("authVerifyCode"),
    resetEmail: t("authSendCode"),
    resetCode: t("authResetButton"),
  };

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
            {titles[step]}
          </Text>
          <Text
            className="mb-6 text-light-colorMuted dark:text-dark-colorMuted"
            style={{ fontFamily: "Fredoka_500Medium", fontSize: 15 }}
          >
            {subtitles[step]}
          </Text>

          <View className="mb-4 gap-3">
            {showsEmail && (
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
                onSubmitEditing={submitIfReady}
                className="rounded-xl px-4 py-3 text-lg"
              />
            )}
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
            {showsCode && (
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
                onSubmitEditing={submitIfReady}
                className="rounded-xl px-4 py-3 text-lg tracking-[6px]"
              />
            )}
            {showsPassword && (
              <View className="justify-center">
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder={
                    step === "resetCode"
                      ? t("authNewPassword")
                      : t("authPassword")
                  }
                  secureTextEntry={!showPassword}
                  autoComplete={
                    choosesPassword ? "new-password" : "current-password"
                  }
                  textContentType={choosesPassword ? "newPassword" : "password"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={submitIfReady}
                  className="rounded-xl py-3 pl-4 pr-12 text-lg"
                />
                <Pressable
                  onPress={() => setShowPassword((shown) => !shown)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? t("authHidePassword") : t("authShowPassword")
                  }
                  className="absolute right-2 h-9 w-9 items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.colorMuted} />
                  ) : (
                    <Eye size={20} color={theme.colorMuted} />
                  )}
                </Pressable>
              </View>
            )}
            {choosesPassword && password.length > 0 && !passwordLongEnough && (
              <Text className="text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
                {t("authPasswordTooShort")}
              </Text>
            )}
          </View>

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
            onPress={() => void submit()}
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
                {buttonLabels[step]}
              </Text>
            )}
          </Button>

          {step === "signIn" && (
            <View className="mt-5 items-center gap-4">
              <Pressable
                onPress={() => goTo("resetEmail")}
                disabled={working}
                hitSlop={8}
              >
                <Text className="text-sm text-light-color dark:text-dark-color">
                  {t("authForgotPassword")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => goTo("signUp")}
                disabled={working}
                hitSlop={8}
              >
                <Text className="text-sm text-light-colorMuted dark:text-dark-colorMuted">
                  {t("authNoAccountPrompt")}{" "}
                  <Text className="text-sm text-light-color dark:text-dark-color">
                    {t("authCreateAccountLink")}
                  </Text>
                </Text>
              </Pressable>
            </View>
          )}

          {step === "signUp" && (
            <Pressable
              onPress={() => goTo("signIn")}
              disabled={working}
              hitSlop={8}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-light-colorMuted dark:text-dark-colorMuted">
                {t("authHaveAccountPrompt")}{" "}
                <Text className="text-sm text-light-color dark:text-dark-color">
                  {t("authSignInLink")}
                </Text>
              </Text>
            </Pressable>
          )}

          {step === "resetEmail" && (
            <Pressable
              onPress={() => goTo("signIn")}
              disabled={working}
              hitSlop={8}
              className="mt-5 items-center"
            >
              <Text className="text-sm text-light-color dark:text-dark-color">
                {t("authBackToSignIn")}
              </Text>
            </Pressable>
          )}

          {showsCode && (
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
              <Pressable onPress={goBack} disabled={working} hitSlop={8}>
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
