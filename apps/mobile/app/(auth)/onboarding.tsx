import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import LanguageSelector from "@/components/LanguageSelector";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchGuestMe, submitOnboarding } from "@/lib/api";
import type { GenderValue } from "@/lib/api";
import { appPlatform } from "@/lib/app-platform";
import { signedInHomeHref } from "@/lib/pending-join";
import useStore from "@/store/useStore";
import { LookingForGender } from "@/types/user";
import { useAuth, useUser } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner-native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaFrame } from "react-native-safe-area-context";
import LoadingIndicator from "@/components/loading-indicator";
import BirthdayInput from "@/components/birthday-input";
import { differenceInYears, format, subYears } from "date-fns";
import { CardOption } from "@/components/onboarding/CardOption";
import { PhotoPickerStep } from "@/components/onboarding/PhotoPickerStep";
import {
  FIRST_NAME_MAX_LENGTH,
  GENDER_OPTIONS,
  LOOKING_FOR_GENDER_OPTIONS,
  TOTAL_STEPS,
  STEP_CONTENT_STYLE,
} from "@/components/onboarding/onboardingSteps";

// ─── Constants ────────────────────────────────────────────────────────────────

// The API refuses a longer first name (apps/api/src/guests/dto/
// onboarding.dto.ts). Change both together.
// ─── Step definitions ─────────────────────────────────────────────────────────

// Only what Matches needs, so a guest who scanned a QR code at the door is
// swiping in about a minute. Why they're here, interests and a bio are added
// later from the Profile tab ("Finish your profile").
// ─── Sub-components ───────────────────────────────────────────────────────────

// ─── Photo picker step ────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  // KeyboardAvoidingView measures its bottom edge from its parent but the
  // keyboard from the screen, so it needs the distance between the two.
  const { y: screenTop } = useSafeAreaFrame();
  const router = useRouter();
  const { setUser } = useStore();
  const { userId, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const steps = [
    {
      id: "name",
      title: t("onboardingStepNameTitle"),
      subtitle: t("onboardingStepNameSubtitle"),
    },
    {
      id: "birthday",
      title: t("onboardingStepBirthdayTitle"),
      subtitle: t("onboardingStepBirthdaySubtitle"),
    },
    {
      id: "gender",
      title: t("onboardingStepGenderTitle"),
      subtitle: t("onboardingStepGenderSubtitle"),
    },
    {
      id: "lookingForGender",
      title: t("onboardingStepInterestedTitle"),
      subtitle: t("onboardingStepInterestedSubtitle"),
    },
    {
      id: "photo",
      title: t("onboardingStepPhotoTitle"),
      subtitle: t("onboardingStepPhotoSubtitle"),
    },
  ] as const;

  // Check if onboarding is already complete
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChecking(false);
      return;
    }
    getToken()
      .then((token) => {
        if (!token) throw new Error("No token");
        return fetchGuestMe(token);
      })
      .then(({ guest, isOnboardingComplete }) => {
        if (isOnboardingComplete) {
          router.replace(signedInHomeHref());
        } else {
          // Pre-populate photos from the database so previously uploaded
          // photos are visible if the user returns before finishing.
          if (guest?.picture_urls?.length) {
            setPhotos(guest.picture_urls);
          }
          setChecking(false);
        }
      })
      .catch(() => {
        // Can't reach API — let them fill out the form anyway
        setChecking(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Step state
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  // The name Google or Apple gave Clerk, once it loads, unless one is typed.
  const clerkFirstName = clerkUser?.firstName?.trim() ?? "";
  const [nameEdited, setNameEdited] = useState(false);
  const shownFirstName = nameEdited
    ? firstName
    : firstName || clerkFirstName.slice(0, FIRST_NAME_MAX_LENGTH);
  // None until the guest picks one: a date filled in for them made everyone
  // who tapped through exactly 18.
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [lookingForGender, setLookingForGender] = useState<
    LookingForGender | ""
  >("");
  // Uploaded R2 URLs (up to 3); populated as photos are picked and uploaded
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  // "Email me when the Tulum app is out": unticked until the guest ticks it.
  const [launchEmailOptIn, setLaunchEmailOptIn] = useState(false);

  // ── Validation ────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (steps[step].id) {
      case "name":
        return shownFirstName.trim().length > 0;
      case "birthday": {
        return (
          birthday !== null && differenceInYears(new Date(), birthday) >= 18
        );
      }
      case "gender":
        return gender !== "";
      case "lookingForGender":
        return lookingForGender !== "";
      case "photo":
        // The deck shows a photo per guest; while one uploads, wait for it.
        return photos.length >= 1 && !photoUploading;
      default:
        return false;
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void finishOnboarding();
    }
  };

  // Onboarding is opened with replace (sign-in, the SSO callback, the index
  // redirect), so the first step usually has no screen to go back to. Back
  // only shows when it can do something. Read after render, where
  // canGoBack() can be stale and React Navigation warns about it.
  const [hasScreenBehind, setHasScreenBehind] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setHasScreenBehind(router.canGoBack());
    }, [router]),
  );
  const canGoBack = step > 0 || hasScreenBehind;

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const finishOnboarding = async () => {
    const name = shownFirstName.trim();
    if (!userId || !name || !birthday || !gender || !lookingForGender) {
      setSubmitError(t("onboardingMissingRequiredFields"));
      return;
    }

    const age = differenceInYears(new Date(), birthday);
    const birthdayIso = format(new Date(birthday), "yyyy-MM-dd");

    // Map lookingForGender → interested_in array
    const interestedIn: GenderValue[] =
      lookingForGender === "everyone"
        ? ["male", "female", "other"]
        : [lookingForGender as GenderValue];

    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await getToken();
      if (!token) {
        setSubmitError(t("onboardingAuthError"));
        setSubmitting(false);
        return;
      }
      await submitOnboarding(token, {
        first_name: name,
        gender: gender as GenderValue,
        interested_in: interestedIn,
        picture_urls: photos,
        birthday: birthdayIso,
        launch_email_opt_in: launchEmailOptIn,
        consent_wording: t("launchEmailConsent"),
        language: i18n.language,
        signup_platform: appPlatform(),
      });

      setUser({
        firstName: name,
        birthday: birthdayIso,
        age,
        gender: gender as "male" | "female" | "other",
        lookingForGender: lookingForGender as LookingForGender,
        tags: [],
        imgUrl: photos[0],
        photos,
      });

      router.replace(signedInHomeHref());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[onboarding] submitOnboarding failed:", msg);
      const userMessage = t("onboardingSubmitError");
      toast.error(t("onboardingSaveFailed"), { description: userMessage });
      setSubmitError(userMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    const currentStep = steps[step];

    switch (currentStep.id) {
      case "name":
        return (
          <Input
            inputMode="text"
            value={shownFirstName}
            onChangeText={(text) => {
              setNameEdited(true);
              setFirstName(text);
            }}
            placeholder={t("onboardingFirstNamePlaceholder")}
            maxLength={FIRST_NAME_MAX_LENGTH}
            autoFocus
            autoCapitalize="words"
            className="rounded-xl px-4 py-3 text-xl text-light-colorStrong dark:text-dark-colorStrong"
          />
        );

      case "birthday":
        return (
          <View>
            <BirthdayInput
              value={birthday ?? undefined}
              minimumDate={new Date(1900, 0, 1)}
              maximumDate={new Date(subYears(new Date(), 18))}
              onChange={(dateString) => {
                const [year, month, day] = dateString.split("-").map(Number);

                setBirthday(new Date(year, month - 1, day, 12));
              }}
            />
            {birthday === null && (
              <Text className="mt-4 text-center text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
                {t("onboardingBirthdayHint")}
              </Text>
            )}
          </View>
        );

      case "gender":
        return (
          <View>
            {GENDER_OPTIONS.map((opt) => (
              <CardOption
                key={opt.value}
                label={t(opt.labelKey)}
                selected={gender === opt.value}
                onPress={() => setGender(opt.value)}
              />
            ))}
          </View>
        );

      case "lookingForGender":
        return (
          <View>
            {LOOKING_FOR_GENDER_OPTIONS.map((opt) => (
              <CardOption
                key={opt.value}
                label={t(opt.labelKey)}
                selected={lookingForGender === opt.value}
                onPress={() => setLookingForGender(opt.value)}
              />
            ))}
          </View>
        );

      case "photo":
        return (
          <PhotoPickerStep
            photos={photos}
            onPhotosChange={setPhotos}
            uploading={photoUploading}
            onUploadingChange={setPhotoUploading}
            permissionTitle={t("onboardingPermissionRequired")}
            permissionMessage={t("onboardingPhotoPermissionMessage")}
            uploadFailedTitle={t("onboardingUploadFailed")}
            removeFailedTitle={t("onboardingRemoveFailed")}
            addPhotoLabel={t("onboardingAddPhoto")}
            photosCounter={(count) =>
              count === 0
                ? t("onboardingAddOnePhoto")
                : t("onboardingPhotosAdded", { count })
            }
            launchEmailOptIn={launchEmailOptIn}
            onLaunchEmailOptInChange={setLaunchEmailOptIn}
            launchEmailLabel={t("launchEmailConsent")}
            launchEmailNote={t("launchEmailConsentNote")}
          />
        );

      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;
  const isLastStep = step === TOTAL_STEPS - 1;

  if (checking) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background"
      >
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      className="flex-1 bg-light-background dark:bg-dark-background"
    >
      <View className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={screenTop}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View className="px-5 pt-3 pb-2">
          {/* Back button + progress bar, clear of the language flag */}
          <View className="flex-row items-center gap-4 mb-4 pr-10">
            {canGoBack ? (
              <Pressable
                onPress={handleBack}
                hitSlop={12}
                className="h-9 w-9 items-center justify-center rounded-full bg-light-backgroundMuted dark:bg-dark-backgroundMuted"
              >
                <ArrowLeft size={18} color={theme.colorStrong} />
              </Pressable>
            ) : (
              // Same size as the button, so the progress bar doesn't move.
              <View className="h-9 w-9" />
            )}

            {/* Progress bar */}
            <View
              className="flex-1 overflow-hidden rounded-full bg-light-backgroundMuted dark:bg-dark-backgroundMuted"
              style={{ height: 4 }}
            >
              <View
                className="h-full rounded-full bg-light-color dark:bg-dark-color"
                style={{ width: `${progressPercent}%` }}
              />
            </View>

            <Text className="min-w-9 text-right text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
              {step + 1}/{TOTAL_STEPS}
            </Text>
          </View>

          {/* Step title */}
          <Text className="text-[26px] font-extrabold tracking-[-0.3px] text-light-colorStrong dark:text-dark-colorStrong">
            {steps[step].title}
          </Text>
          {steps[step].subtitle && (
            <Text className="mt-1 text-[15px] text-light-colorMuted dark:text-dark-colorMuted">
              {steps[step].subtitle}
            </Text>
          )}
        </View>

        {/* ── Step content ─────────────────────────────────────────────── */}
        {/* The birthday wheel's lists scroll themselves and can't sit inside a
            vertical ScrollView; the wheel always fits the screen. */}
        {steps[step].id === "birthday" ? (
          <View className="flex-1" style={STEP_CONTENT_STYLE}>
            {renderStepContent()}
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={STEP_CONTENT_STYLE}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderStepContent()}
          </ScrollView>
        )}

        {/* ── Continue button ───────────────────────────────────────────── */}
        <View className="border-t border-light-border px-5 pb-4 pt-3 dark:border-dark-border">
          {submitError && (
            <Text className="mb-2 text-center text-[13px] text-red-500">
              {submitError}
            </Text>
          )}
          <Button
            onPress={handleNext}
            disabled={!canProceed() || submitting}
            variant="default"
            size="lg"
            className="w-full h-14 rounded-full bg-light-color dark:bg-dark-color"
            style={
              !canProceed() || submitting
                ? { opacity: 0.45, borderRadius: 999 }
                : { borderRadius: 999 }
            }
          >
            {submitting ? (
              <LoadingIndicator />
            ) : (
              <Text className="text-base font-bold text-white">
                {isLastStep
                  ? t("onboardingCompleteProfile")
                  : t("onboardingContinue")}
              </Text>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
