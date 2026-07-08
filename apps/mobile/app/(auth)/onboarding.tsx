import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import LanguageSelector from "@/components/LanguageSelector";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  deleteGuestPhoto,
  fetchGuestMe,
  submitOnboarding,
  uploadGuestPhoto,
} from "@/lib/api";
import type { GenderValue, SeekingValue } from "@/lib/api";
import useStore from "@/store/useStore";
import { LookingForGender } from "@/types/user";
import { useAuth } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, Check, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAGS_OPTIONS = [
  { value: "Photography", labelKey: "photography" },
  { value: "Travel", labelKey: "travel" },
  { value: "Yoga", labelKey: "yoga" },
  { value: "Music", labelKey: "music" },
  { value: "Coffee", labelKey: "coffee" },
  { value: "Art", labelKey: "art" },
  { value: "Dancing", labelKey: "dancing" },
  { value: "Hiking", labelKey: "hiking" },
  { value: "Food", labelKey: "food" },
  { value: "Tech", labelKey: "tech" },
  { value: "Fitness", labelKey: "fitness" },
  { value: "Reading", labelKey: "reading" },
  { value: "Movies", labelKey: "movies" },
  { value: "Gaming", labelKey: "gaming" },
  { value: "Fashion", labelKey: "fashion" },
];

const LOOKING_FOR_OPTIONS: { labelKey: string; value: SeekingValue }[] = [
  { labelKey: "onboardingSeekingCasual", value: "casual" },
  { labelKey: "onboardingSeekingRelationship", value: "relationship" },
  { labelKey: "onboardingSeekingFriendship", value: "friendship" },
  { labelKey: "onboardingSeekingParty", value: "party" },
];

const VENUE_OPTIONS: { emoji: string; labelKey: string; value: string }[] = [
  { emoji: "🍺", labelKey: "bar", value: "bar" },
  { emoji: "🍻", labelKey: "pub", value: "pub" },
  { emoji: "🕺", labelKey: "nightclub", value: "nightclub" },
  { emoji: "🍽️", labelKey: "restaurant", value: "restaurant" },
  { emoji: "☕", labelKey: "cafe", value: "cafe" },
  { emoji: "🍸", labelKey: "cocktailBar", value: "cocktail_bar" },
  { emoji: "🍷", labelKey: "wineBar", value: "wine_bar" },
  { emoji: "🍺", labelKey: "brewery", value: "brewery" },
  { emoji: "🏮", labelKey: "tavern", value: "tavern" },
  { emoji: "⛵", labelKey: "raft", value: "raft" },
];

const GENDER_OPTIONS: {
  labelKey: string;
  value: "male" | "female" | "other";
}[] = [
  { labelKey: "onboardingGenderMan", value: "male" },
  { labelKey: "onboardingGenderWoman", value: "female" },
  { labelKey: "onboardingGenderOther", value: "other" },
];

const LOOKING_FOR_GENDER_OPTIONS: {
  labelKey: string;
  value: LookingForGender;
}[] = [
  { labelKey: "onboardingInterestedMen", value: "male" },
  { labelKey: "onboardingInterestedWomen", value: "female" },
  { labelKey: "onboardingInterestedEveryone", value: "everyone" },
];

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEP_IDS = [
  "name",
  "birthday",
  "gender",
  "lookingForGender",
  "lookingFor",
  "tags",
  "venueTypes",
  "photo",
  "bio",
] as const;

const TOTAL_STEPS = STEP_IDS.length;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert DD/MM/YYYY or YYYY-MM-DD to an approximate age */
function parseAge(birthday: string): number | undefined {
  // Try DD/MM/YYYY
  const parts = birthday.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (year && month && day) {
      const dob = new Date(year, month - 1, day);
      const ageDiff = Date.now() - dob.getTime();
      return Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
    }
  }
  return undefined;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChipOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-2xl px-4 py-3 mb-2 mr-2"
      style={{
        backgroundColor: selected ? theme.color : theme.backgroundMuted,
        borderWidth: 1.5,
        borderColor: selected ? theme.color : "transparent",
      }}
    >
      {selected && <Check size={14} color="#fff" />}
      <Text
        style={{
          fontSize: 14,
          fontWeight: selected ? "600" : "400",
          color: selected ? "#fff" : theme.colorStrong,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CardOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl px-5 py-4 mb-3"
      style={{
        backgroundColor: selected ? theme.color025 : theme.backgroundMuted,
        borderWidth: 1.5,
        borderColor: selected ? theme.color : "transparent",
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: selected ? "600" : "400",
          color: selected ? theme.color : theme.colorStrong,
        }}
      >
        {label}
      </Text>
      {selected && (
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.color }}
        >
          <Check size={13} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

// ─── Birthday input ───────────────────────────────────────────────────────────

function BirthdayInput({
  value,
  onChange,
  placeholder,
  formatLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  formatLabel: string;
}) {
  const theme = useAppTheme();

  const handleChange = (text: string) => {
    // Auto-insert slashes: DD/MM/YYYY
    const digits = text.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 2)
      formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4)
      formatted =
        digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    onChange(formatted);
  };

  return (
    <View>
      <Input
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        keyboardType="numeric"
        maxLength={10}
        style={{
          height: 56,
          fontSize: 22,
          textAlign: "center",
          borderRadius: 16,
          letterSpacing: 2,
          color: theme.colorStrong,
        }}
      />
      <Text
        style={{
          fontSize: 12,
          color: theme.colorMuted,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        {formatLabel}
      </Text>
    </View>
  );
}

// ─── Photo picker step ────────────────────────────────────────────────────────

function PhotoPickerStep({
  photos,
  onPhotosChange,
  uploading,
  onUploadingChange,
  permissionTitle,
  permissionMessage,
  uploadFailedTitle,
  removeFailedTitle,
  addPhotoLabel,
  photosCounter,
}: {
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  uploading: boolean;
  onUploadingChange: (v: boolean) => void;
  permissionTitle: string;
  permissionMessage: string;
  uploadFailedTitle: string;
  removeFailedTitle: string;
  addPhotoLabel: string;
  photosCounter: (count: number) => string;
}) {
  const theme = useAppTheme();
  const { getToken } = useAuth();

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(permissionTitle, permissionMessage);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    onUploadingChange(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const updatedUrls = await uploadGuestPhoto(
        token,
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );
      onPhotosChange(updatedUrls);
    } catch (err) {
      Alert.alert(
        uploadFailedTitle,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      onUploadingChange(false);
    }
  };

  const removePhoto = async (url: string) => {
    onUploadingChange(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const updatedUrls = await deleteGuestPhoto(token, url);
      onPhotosChange(updatedUrls);
    } catch (err) {
      Alert.alert(
        removeFailedTitle,
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      onUploadingChange(false);
    }
  };

  const slots = Array.from({ length: 3 });

  return (
    <View>
      <View className="flex-row flex-wrap gap-3 justify-center">
        {slots.map((_, idx) => {
          const photoUrl = photos[idx];
          return (
            <View
              key={idx}
              className="w-[30%] aspect-[3/4] rounded-2xl overflow-hidden"
              style={{ backgroundColor: theme.backgroundMuted }}
            >
              {photoUrl ? (
                <>
                  <Image
                    source={{ uri: photoUrl }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                  <Pressable
                    onPress={() => removePhoto(photoUrl)}
                    disabled={uploading}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                  >
                    <Trash2 size={14} color="#fff" />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={photos.length >= 3 ? undefined : pickAndUpload}
                  disabled={uploading || photos.length >= 3}
                  className="flex-1 items-center justify-center gap-1"
                >
                  {uploading && idx === photos.length ? (
                    <ActivityIndicator color={theme.color} />
                  ) : (
                    <>
                      <Camera
                        size={24}
                        color={
                          photos.length >= 3
                            ? theme.backgroundMuted
                            : theme.colorMuted
                        }
                      />
                      {idx === 0 && photos.length === 0 && (
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.colorMuted,
                            textAlign: "center",
                          }}
                        >
                          {addPhotoLabel}
                        </Text>
                      )}
                    </>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
      <Text
        style={{
          fontSize: 13,
          color: theme.colorMuted,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        {photosCounter(photos.length)}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser } = useStore();
  const { userId, getToken } = useAuth();

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
      id: "lookingFor",
      title: t("onboardingStepLookingForTitle"),
      subtitle: t("onboardingStepLookingForSubtitle"),
    },
    {
      id: "tags",
      title: t("onboardingStepTagsTitle"),
      subtitle: t("onboardingStepTagsSubtitle"),
    },
    {
      id: "venueTypes",
      title: t("onboardingStepVenuesTitle"),
      subtitle: t("onboardingStepVenuesSubtitle"),
    },
    {
      id: "photo",
      title: t("onboardingStepPhotoTitle"),
      subtitle: t("onboardingStepPhotoSubtitle"),
    },
    {
      id: "bio",
      title: t("onboardingStepBioTitle"),
      subtitle: t("onboardingStepBioSubtitle"),
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
          router.replace("/(tabs)");
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
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [lookingForGender, setLookingForGender] = useState<
    LookingForGender | ""
  >("");
  const [seeking, setSeeking] = useState<SeekingValue | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  // Uploaded R2 URLs (up to 3); populated as photos are picked and uploaded
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [bio, setBio] = useState("");

  // ── Validation ────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (steps[step].id) {
      case "name":
        return firstName.trim().length > 0;
      case "birthday": {
        if (birthday.length !== 10) return false;
        const [dd, mm, yyyy] = birthday.split("/").map(Number);
        const d = new Date(yyyy, mm - 1, dd);
        return (
          d.getFullYear() === yyyy &&
          d.getMonth() === mm - 1 &&
          d.getDate() === dd &&
          yyyy >= 1900 &&
          yyyy <= new Date().getFullYear()
        );
      }
      case "gender":
        return gender !== "";
      case "lookingForGender":
        return lookingForGender !== "";
      case "lookingFor":
        return seeking !== "";
      case "tags":
        return tags.length >= 1;
      case "venueTypes":
        return venueTypes.length >= 1;
      case "photo":
        return true; // photo optional
      case "bio":
        return true; // bio optional
      default:
        return false;
    }
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────

  const toggleItem = useCallback(
    <T extends string>(
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      val: T,
    ) => {
      setter((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
      );
    },
    [],
  );

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      void finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const finishOnboarding = async () => {
    if (!userId || !gender || !seeking || !lookingForGender) {
      Alert.alert(
        t("onboardingMissingRequiredFields"),
        `Debug: userId=${userId}, gender=${gender}, seeking=${seeking}, lookingForGender=${lookingForGender}`,
      );
      return;
    }

    const age = parseAge(birthday);

    // Convert DD/MM/YYYY → YYYY-MM-DD
    const [dd, mm, yyyy] = birthday.split("/");
    const birthdayIso = `${yyyy}-${mm}-${dd}`;

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
        gender: gender as GenderValue,
        seeking: seeking as SeekingValue,
        interested_in: interestedIn,
        interests: tags,
        picture_urls: photos,
        birthday: birthdayIso,
      });

      setUser({
        firstName: firstName.trim(),
        birthday,
        age,
        gender: gender as "male" | "female" | "other",
        lookingForGender: lookingForGender as LookingForGender,
        tags,
        preferredVenueTypes: venueTypes,
        imgUrl: photos[0],
        photos,
        info: bio.trim() || undefined,
      });

      router.replace("/(tabs)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[onboarding] submitOnboarding failed:", msg);
      Alert.alert(t("onboardingSaveFailed"), msg);
      setSubmitError(msg);
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
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t("onboardingFirstNamePlaceholder")}
            autoFocus
            autoCapitalize="words"
            className="px-4 py-3 rounded-xl text-xl"
            style={{ color: theme.colorStrong }}
          />
        );

      case "birthday":
        return (
          <BirthdayInput
            value={birthday}
            onChange={setBirthday}
            placeholder={t("onboardingBirthdayPlaceholder")}
            formatLabel={t("onboardingBirthdayFormat")}
          />
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

      case "lookingFor":
        return (
          <View>
            {LOOKING_FOR_OPTIONS.map((opt) => (
              <CardOption
                key={opt.value}
                label={t(opt.labelKey)}
                selected={seeking === opt.value}
                onPress={() => setSeeking(opt.value)}
              />
            ))}
          </View>
        );

      case "tags":
        return (
          <View className="flex-row flex-wrap">
            {TAGS_OPTIONS.map((tag) => (
              <ChipOption
                key={tag.value}
                label={t(tag.labelKey)}
                selected={tags.includes(tag.value)}
                onPress={() => toggleItem(setTags, tag.value)}
              />
            ))}
          </View>
        );

      case "venueTypes":
        return (
          <View className="flex-row flex-wrap">
            {VENUE_OPTIONS.map((opt) => (
              <ChipOption
                key={opt.value}
                label={`${opt.emoji} ${t(opt.labelKey)}`}
                selected={venueTypes.includes(opt.value)}
                onPress={() => toggleItem(setVenueTypes, opt.value)}
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
                ? t("onboardingAddUpToPhotos")
                : t("onboardingPhotosAdded", { count })
            }
          />
        );

      case "bio":
        return (
          <Textarea
            value={bio}
            onChangeText={setBio}
            placeholder={t("onboardingBioPlaceholder")}
            autoFocus
            className="min-h-[140px]"
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
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.color} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View className="px-5 pt-3 pb-2">
          {/* Back button + progress bar */}
          <View className="flex-row items-center gap-4 mb-4">
            <Pressable
              onPress={handleBack}
              hitSlop={12}
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.backgroundMuted }}
            >
              <ArrowLeft size={18} color={theme.colorStrong} />
            </Pressable>

            {/* Progress bar */}
            <View
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 4, backgroundColor: theme.backgroundMuted }}
            >
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: theme.color,
                }}
              />
            </View>

            <Text
              style={{
                fontSize: 13,
                color: theme.colorMuted,
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {step + 1}/{TOTAL_STEPS}
            </Text>
          </View>

          {/* Step title */}
          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: theme.colorStrong,
              letterSpacing: -0.3,
            }}
          >
            {steps[step].title}
          </Text>
          {steps[step].subtitle && (
            <Text
              style={{ fontSize: 15, color: theme.colorMuted, marginTop: 4 }}
            >
              {steps[step].subtitle}
            </Text>
          )}
        </View>

        {/* ── Step content ─────────────────────────────────────────────── */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        {/* ── Continue button ───────────────────────────────────────────── */}
        <View
          className="px-5 pb-4 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: theme.border }}
        >
          {submitError && (
            <Text
              style={{
                color: "red",
                fontSize: 13,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              {submitError}
            </Text>
          )}
          <Button
            onPress={handleNext}
            disabled={!canProceed() || submitting}
            size="lg"
            className="w-full rounded-2xl"
            style={!canProceed() || submitting ? { opacity: 0.45 } : {}}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
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
