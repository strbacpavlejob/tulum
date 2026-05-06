import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useAppTheme } from "@/hooks/useAppTheme";
import useStore from "@/store/useStore";
import { LookingFor, LookingForGender } from "@/types/user";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, Check } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAGS_OPTIONS = [
  "Photography",
  "Travel",
  "Yoga",
  "Music",
  "Coffee",
  "Art",
  "Dancing",
  "Hiking",
  "Food",
  "Tech",
  "Fitness",
  "Reading",
  "Movies",
  "Gaming",
  "Fashion",
];

const LOOKING_FOR_OPTIONS: { label: string; value: LookingFor }[] = [
  { label: "To date", value: "to date" },
  { label: "To party", value: "to party" },
  { label: "Open to chat", value: "open to chat" },
  { label: "Ready for a relationship", value: "ready for a relationship" },
];

const VENUE_OPTIONS: { label: string; value: string }[] = [
  { label: "🍺 Bar", value: "bar" },
  { label: "🍻 Pub", value: "pub" },
  { label: "🕺 Nightclub", value: "nightclub" },
  { label: "🍽️ Restaurant", value: "restaurant" },
  { label: "☕ Cafe", value: "cafe" },
  { label: "🍸 Cocktail Bar", value: "cocktail_bar" },
  { label: "🍷 Wine Bar", value: "wine_bar" },
  { label: "🍺 Brewery", value: "brewery" },
  { label: "🏮 Tavern", value: "tavern" },
  { label: "⛵ Raft", value: "raft" },
];

const GENDER_OPTIONS: { label: string; value: "male" | "female" | "other" }[] =
  [
    { label: "Man", value: "male" },
    { label: "Woman", value: "female" },
    { label: "Other", value: "other" },
  ];

const LOOKING_FOR_GENDER_OPTIONS: {
  label: string;
  value: LookingForGender;
}[] = [
  { label: "Men", value: "male" },
  { label: "Women", value: "female" },
  { label: "Everyone", value: "everyone" },
];

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "name",
    title: "What's your name?",
    subtitle: "This is how you'll appear to others",
  },
  {
    id: "birthday",
    title: "When were you born?",
    subtitle: "Your age will be visible on your profile",
  },
  {
    id: "gender",
    title: "How do you identify?",
    subtitle: "This helps us show you relevant people",
  },
  {
    id: "lookingForGender",
    title: "Who are you interested in?",
    subtitle: "We'll tailor your matches accordingly",
  },
  {
    id: "lookingFor",
    title: "Why are you here?",
    subtitle: "Select everything that applies",
  },
  {
    id: "tags",
    title: "What are your interests?",
    subtitle: "Pick things you enjoy to find your crowd",
  },
  {
    id: "venueTypes",
    title: "What venues do you love?",
    subtitle: "We'll surface events you'll actually enjoy",
  },
  {
    id: "photo",
    title: "Add a profile photo",
    subtitle: "A photo helps others recognize you",
  },
  {
    id: "bio",
    title: "Tell us about yourself",
    subtitle: "A short bio goes a long way",
  },
] as const;

const TOTAL_STEPS = STEPS.length;

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
}: {
  value: string;
  onChange: (v: string) => void;
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
        placeholder="DD / MM / YYYY"
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
        Format: DD / MM / YYYY
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { setUser } = useStore();

  // Step state
  const [step, setStep] = useState(0);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [lookingForGender, setLookingForGender] = useState<
    LookingForGender | ""
  >("");
  const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  const [photoUri] = useState<string>(
    // Mock photo — replace with real expo-image-picker call
    "https://api.dicebear.com/7.x/adventurer/png?seed=" + Math.random(),
  );
  const [bio, setBio] = useState("");

  // ── Validation ────────────────────────────────────────────────────────────

  const canProceed = (): boolean => {
    switch (STEPS[step].id) {
      case "name":
        return firstName.trim().length > 0;
      case "birthday":
        return birthday.length === 10;
      case "gender":
        return gender !== "";
      case "lookingForGender":
        return lookingForGender !== "";
      case "lookingFor":
        return lookingFor.length > 0;
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
      finishOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  };

  const finishOnboarding = () => {
    const age = parseAge(birthday);

    setUser({
      firstName: firstName.trim(),
      birthday,
      age,
      gender: gender as "male" | "female" | "other",
      lookingForGender: lookingForGender as LookingForGender,
      lookingFor,
      tags,
      preferredVenueTypes: venueTypes,
      imgUrl: photoUri,
      photos: [photoUri],
      info: bio.trim() || undefined,
    });
    // Auth routing in _layout.tsx will redirect to (tabs) automatically
  };

  // ── Step content ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    const currentStep = STEPS[step];

    switch (currentStep.id) {
      case "name":
        return (
          <Input
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            autoFocus
            autoCapitalize="words"
            style={{ height: 56, fontSize: 18, borderRadius: 16 }}
          />
        );

      case "birthday":
        return <BirthdayInput value={birthday} onChange={setBirthday} />;

      case "gender":
        return (
          <View>
            {GENDER_OPTIONS.map((opt) => (
              <CardOption
                key={opt.value}
                label={opt.label}
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
                label={opt.label}
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
                label={opt.label}
                selected={lookingFor.includes(opt.value)}
                onPress={() => toggleItem(setLookingFor, opt.value)}
              />
            ))}
          </View>
        );

      case "tags":
        return (
          <View className="flex-row flex-wrap">
            {TAGS_OPTIONS.map((tag) => (
              <ChipOption
                key={tag}
                label={tag}
                selected={tags.includes(tag)}
                onPress={() => toggleItem(setTags, tag)}
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
                label={opt.label}
                selected={venueTypes.includes(opt.value)}
                onPress={() => toggleItem(setVenueTypes, opt.value)}
              />
            ))}
          </View>
        );

      case "photo":
        return (
          <View className="items-center gap-4">
            <Pressable
              className="w-40 h-40 rounded-full items-center justify-center"
              style={{ backgroundColor: theme.backgroundMuted }}
            >
              <Camera size={40} color={theme.colorMuted} />
              <Text
                style={{
                  fontSize: 13,
                  color: theme.colorMuted,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Tap to upload
              </Text>
            </Pressable>
            <Text style={{ fontSize: 13, color: theme.colorMuted }}>
              Photo upload coming soon — you can skip this step
            </Text>
          </View>
        );

      case "bio":
        return (
          <Textarea
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others a little about yourself…"
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

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
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
            {STEPS[step].title}
          </Text>
          {STEPS[step].subtitle && (
            <Text
              style={{ fontSize: 15, color: theme.colorMuted, marginTop: 4 }}
            >
              {STEPS[step].subtitle}
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
          <Button
            onPress={handleNext}
            disabled={!canProceed()}
            size="lg"
            className="w-full rounded-2xl"
            style={!canProceed() ? { opacity: 0.45 } : {}}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {isLastStep ? "Complete Profile" : "Continue"}
            </Text>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
