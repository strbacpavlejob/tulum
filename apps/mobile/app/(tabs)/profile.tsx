import Blob from "@/components/Blob";
import ProfileInfoView from "@/components/ProfileInfoView";
import Tags from "@/components/Tags";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchMyProfile } from "@/lib/api";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { VenueType } from "@/types/filter";
import { Settings } from "@/types/settings";
import { User } from "@/types/user";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Bell,
  Bug,
  Check,
  ChevronRight,
  Globe,
  LogOut,
  MapPin,
  Send,
  Sun,
  Trash2,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOOKING_FOR_OPTIONS = [
  "to date",
  "to party",
  "open to chat",
  "ready for a relationship",
];
const DRINKING_OPTIONS = [
  "never",
  "socially",
  "regularly",
  "prefer not to say",
];
const SMOKING_OPTIONS = ["never", "socially", "regularly", "prefer not to say"];
const CHILDREN_OPTIONS = ["no", "yes", "prefer not to say"];
const RELATIONSHIP_OPTIONS = [
  "single",
  "divorced",
  "separated",
  "prefer not to say",
];
const SEXUALITY_OPTIONS = ["straight", "gay", "bisexual", "prefer not to say"];
const STAR_SIGN_OPTIONS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];
const RELIGION_OPTIONS = [
  "atheist",
  "agnostic",
  "christian",
  "muslim",
  "jewish",
  "buddhist",
  "hindu",
  "other",
  "prefer not to say",
];
const PETS_OPTIONS = ["cat", "dog", "fish", "bird", "none"];
const LANGUAGE_OPTIONS = [
  "English",
  "Serbian",
  "Russian",
  "Spanish",
  "French",
  "German",
];
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
const VENUE_OPTIONS: { label: string; value: VenueType }[] = [
  { label: "Bar", value: "bar" },
  { label: "Pub", value: "pub" },
  { label: "Nightclub", value: "nightclub" },
  { label: "Restaurant", value: "restaurant" },
  { label: "Cafe", value: "cafe" },
  { label: "Cocktail Bar", value: "cocktail_bar" },
  { label: "Wine Bar", value: "wine_bar" },
  { label: "Brewery", value: "brewery" },
  { label: "Tavern", value: "tavern" },
  { label: "Raft", value: "raft" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type EditConfig = {
  title: string;
  type: "single" | "multi" | "text";
  options?: string[];
  onSave: (value: string | string[]) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatList(arr?: string[]) {
  return arr && arr.length > 0 ? arr.map(capitalize).join(", ") : undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { user, settings, setUser, setSettings } = useStore();
  const { userId, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [profileLoading, setProfileLoading] = useState(!user);

  useEffect(() => {
    if (!userId) return;
    if (user) return; // already loaded
    setProfileLoading(true);
    fetchMyProfile(userId)
      .then(setUser)
      .catch(console.error)
      .finally(() => setProfileLoading(false));
  }, [userId]);

  const [activeTab, setActiveTab] = useState("profile");
  const [editConfig, setEditConfig] = useState<EditConfig | null>(null);
  const [singleValue, setSingleValue] = useState("");
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");
  const [bugText, setBugText] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const editSheetRef = useRef<BottomSheetModal>(null);
  const bugSheetRef = useRef<BottomSheetModal>(null);
  const editSnapPoints = useMemo(() => ["50%", "85%"], []);
  const bugSnapPoints = useMemo(() => ["45%"], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // ── Edit helpers ────────────────────────────────────────────────────────────

  const openSingleSelect = (
    title: string,
    options: string[],
    current: string,
    onSave: (v: string) => void,
  ) => {
    setSingleValue(current);
    setEditConfig({
      title,
      type: "single",
      options,
      onSave: (v) => onSave(v as string),
    });
    editSheetRef.current?.present();
  };

  const openMultiSelect = (
    title: string,
    options: string[],
    current: string[],
    onSave: (v: string[]) => void,
  ) => {
    setMultiValues([...current]);
    setEditConfig({
      title,
      type: "multi",
      options,
      onSave: (v) => onSave(v as string[]),
    });
    editSheetRef.current?.present();
  };

  const openTextEdit = (
    title: string,
    current: string,
    onSave: (v: string) => void,
  ) => {
    setTextValue(current);
    setEditConfig({ title, type: "text", onSave: (v) => onSave(v as string) });
    editSheetRef.current?.present();
  };

  const patchUser = (patch: Partial<User>) => {
    if (user) setUser({ ...user, ...patch });
  };

  const patchSettings = (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
  };

  const confirmEdit = () => {
    if (!editConfig) return;
    if (editConfig.type === "single") editConfig.onSave(singleValue);
    else if (editConfig.type === "multi") editConfig.onSave(multiValues);
    else if (editConfig.type === "text") editConfig.onSave(textValue);
    editSheetRef.current?.close();
    setEditConfig(null);
  };

  const toggleMulti = (val: string) => {
    setMultiValues((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  if (profileLoading || !user)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.color} size="large" />
      </View>
    );

  // ── Sub-components ──────────────────────────────────────────────────────────

  const SettingsRow = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    right,
  }: {
    icon: React.ComponentType<any>;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between py-[14px]"
    >
      <View className="flex-row items-center gap-[14px] flex-1">
        <Icon size={20} color={theme.color} />
        <View>
          <Text style={{ fontSize: 16, color: theme.colorStrong }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ fontSize: 13, color: theme.colorMuted }}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {right ?? <ChevronRight size={18} color={theme.gray5} />}
    </Pressable>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      style={{ backgroundColor: theme.backgroundFocus }}
    >
      {/* ── Top 1/3: header ──────────────────────────────────────────────── */}
      <View className="flex-1 justify-center items-center px-5">
        {/* Blob decoration */}
        <View className="absolute inset-0" pointerEvents="none">
          <Blob width="100%" color="rgba(255,255,255,0.12)" />
        </View>

        <View className="items-center gap-2.5">
          {/* Avatar */}
          <Avatar alt="Your avatar" className="w-20 h-20">
            <AvatarImage source={{ uri: user.imgUrl }} />
          </Avatar>
          {/* Name + Age */}
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#fff" }}>
            {user.firstName}, {user.age}
          </Text>

          {/* Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
          >
            <Tags tags={user.tags ?? []} />
          </ScrollView>
        </View>
      </View>

      {/* ── Bottom 2/3: tabs ─────────────────────────────────────────────── */}
      <View
        className="rounded-t-[32px] overflow-hidden"
        style={{
          flex: 2,
          backgroundColor: theme.background,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          {/* Tab strip */}
          <TabsList
            className="w-full rounded-none border-b h-12 px-0 py-0"
            style={{
              borderBottomColor: theme.border,
              backgroundColor: theme.background,
            }}
          >
            <TabsTrigger
              value="profile"
              className="flex-1 rounded-none h-full"
              style={
                activeTab === "profile"
                  ? { borderBottomWidth: 2, borderBottomColor: theme.color }
                  : {}
              }
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: activeTab === "profile" ? "600" : "400",
                  color:
                    activeTab === "profile" ? theme.color : theme.colorMuted,
                }}
              >
                Profile
              </Text>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex-1 rounded-none h-full"
              style={
                activeTab === "settings"
                  ? { borderBottomWidth: 2, borderBottomColor: theme.color }
                  : {}
              }
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: activeTab === "settings" ? "600" : "400",
                  color:
                    activeTab === "settings" ? theme.color : theme.colorMuted,
                }}
              >
                Settings
              </Text>
            </TabsTrigger>
          </TabsList>

          {/* ── Profile Info tab ─────────────────────────────────────────── */}
          <TabsContent value="profile" className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              showsVerticalScrollIndicator={false}
            >
              <ProfileInfoView
                user={user}
                editCallbacks={{
                  onEditTags: () =>
                    openMultiSelect(
                      "Tags",
                      TAGS_OPTIONS,
                      user.tags ?? [],
                      (v) => patchUser({ tags: v as string[] }),
                    ),
                  onEditWork: () =>
                    openTextEdit("Work", user.work ?? "", (v) =>
                      patchUser({ work: v }),
                    ),
                  onEditEducation: () =>
                    openTextEdit("Education", user.education ?? "", (v) =>
                      patchUser({ education: v }),
                    ),
                  onEditLookingFor: () =>
                    openMultiSelect(
                      "Why you're here",
                      LOOKING_FOR_OPTIONS,
                      user.lookingFor ?? [],
                      (v) => patchUser({ lookingFor: v as any }),
                    ),
                  onEditBio: () =>
                    openTextEdit("Bio", user.info ?? "", (v) =>
                      patchUser({ info: v }),
                    ),
                  onEditHeight: () =>
                    openTextEdit(
                      "Height (cm)",
                      user.height?.toString() ?? "",
                      (v) =>
                        patchUser({ height: parseInt(v, 10) || undefined }),
                    ),
                  onEditChildren: () =>
                    openSingleSelect(
                      "Children",
                      CHILDREN_OPTIONS,
                      user.hasChildren ?? "",
                      (v) => patchUser({ hasChildren: v as any }),
                    ),
                  onEditDrinking: () =>
                    openSingleSelect(
                      "Drinking",
                      DRINKING_OPTIONS,
                      user.drinking ?? "",
                      (v) => patchUser({ drinking: v as any }),
                    ),
                  onEditLanguages: () =>
                    openMultiSelect(
                      "Languages",
                      LANGUAGE_OPTIONS,
                      user.languages ?? [],
                      (v) => patchUser({ languages: v as string[] }),
                    ),
                  onEditRelationship: () =>
                    openSingleSelect(
                      "Relationship status",
                      RELATIONSHIP_OPTIONS,
                      user.relationship ?? "",
                      (v) => patchUser({ relationship: v as any }),
                    ),
                  onEditSexuality: () =>
                    openSingleSelect(
                      "Sexuality",
                      SEXUALITY_OPTIONS,
                      user.sexuality ?? "",
                      (v) => patchUser({ sexuality: v as any }),
                    ),
                  onEditSmoking: () =>
                    openSingleSelect(
                      "Smoking",
                      SMOKING_OPTIONS,
                      user.smoking ?? "",
                      (v) => patchUser({ smoking: v as any }),
                    ),
                  onEditStarSign: () =>
                    openSingleSelect(
                      "Star sign",
                      STAR_SIGN_OPTIONS,
                      user.starSign ?? "",
                      (v) => patchUser({ starSign: v as any }),
                    ),
                  onEditPets: () =>
                    openMultiSelect(
                      "Pets",
                      PETS_OPTIONS,
                      user.pets ?? [],
                      (v) => patchUser({ pets: v as string[] }),
                    ),
                  onEditReligion: () =>
                    openSingleSelect(
                      "Religion",
                      RELIGION_OPTIONS,
                      user.religion ?? "",
                      (v) => patchUser({ religion: v as any }),
                    ),
                }}
              />
            </ScrollView>
          </TabsContent>

          {/* ── Settings tab ─────────────────────────────────────────────── */}
          <TabsContent value="settings" className="flex-1">
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View className="mx-4 mt-2">
                <SettingsRow
                  icon={Sun}
                  title="Theme"
                  subtitle={capitalize(settings.theme)}
                  onPress={() =>
                    openSingleSelect(
                      "Theme",
                      ["light", "dark", "system"],
                      settings.theme,
                      (v) => patchSettings({ theme: v as any }),
                    )
                  }
                />
                <Separator />
                <SettingsRow
                  icon={Bell}
                  title="Notifications"
                  subtitle={settings.notificationsEnabled ? "On" : "Off"}
                  right={
                    <Switch
                      checked={settings.notificationsEnabled}
                      onCheckedChange={(v) =>
                        patchSettings({ notificationsEnabled: v })
                      }
                    />
                  }
                />
                <Separator />
                <SettingsRow
                  icon={Globe}
                  title="Language"
                  subtitle={
                    settings.language === "EN"
                      ? "English"
                      : settings.language === "RS"
                        ? "Serbian"
                        : "Russian"
                  }
                  onPress={() =>
                    openSingleSelect(
                      "Language",
                      ["EN", "RS", "RU"],
                      settings.language,
                      (v) => patchSettings({ language: v as any }),
                    )
                  }
                />
                <Separator />
                <SettingsRow
                  icon={MapPin}
                  title="Location"
                  subtitle="Belgrade"
                  onPress={undefined}
                  right={<View />}
                />
                <Separator />
                <SettingsRow
                  icon={MapPin}
                  title="Default Venue Type"
                  subtitle={
                    VENUE_OPTIONS.find(
                      (v) => v.value === settings.defaultVenueType,
                    )?.label ?? "Not set"
                  }
                  onPress={() =>
                    openSingleSelect(
                      "Default venue type",
                      VENUE_OPTIONS.map((v) => v.value),
                      settings.defaultVenueType ?? "",
                      (v) =>
                        patchSettings({ defaultVenueType: v as VenueType }),
                    )
                  }
                />
                <Separator />
                <SettingsRow
                  icon={Bug}
                  title="Report a bug"
                  onPress={() => bugSheetRef.current?.present()}
                />
              </View>

              <View className="mx-4 mt-6 gap-3">
                <Button
                  variant="outline"
                  onPress={async () => {
                    await signOut();
                    setUser(null);
                    router.replace("/(auth)/login");
                  }}
                  className="w-full gap-2"
                  style={{ borderColor: theme.border }}
                >
                  <LogOut size={18} color={theme.colorStrong} />
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 15,
                      color: theme.colorStrong,
                    }}
                  >
                    Log out
                  </Text>
                </Button>

                <Button
                  variant="outline"
                  onPress={() => setShowDeleteAlert(true)}
                  className="w-full gap-2"
                  style={{ borderColor: theme.destructive }}
                >
                  <Trash2 size={18} color={theme.destructive} />
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 15,
                      color: theme.destructive,
                    }}
                  >
                    Delete account
                  </Text>
                </Button>
              </View>
            </ScrollView>
          </TabsContent>
        </Tabs>
      </View>

      {/* ── Edit bottom sheet ─────────────────────────────────────────────── */}
      <BottomSheetModal
        ref={editSheetRef}
        snapPoints={editSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.backgroundPopover }}
        handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {editConfig && (
            <>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.colorStrong,
                  marginBottom: 16,
                  marginTop: 4,
                }}
              >
                {editConfig.title}
              </Text>

              {/* Single select */}
              {editConfig.type === "single" &&
                (editConfig.options ?? []).map((opt) => (
                  <Button
                    key={opt}
                    variant="ghost"
                    onPress={() => {
                      setSingleValue(opt);
                      editConfig.onSave(opt);
                      editSheetRef.current?.close();
                      setEditConfig(null);
                    }}
                    className="w-full justify-between h-auto py-3.5 px-3 rounded-xl mb-0.5"
                    style={
                      singleValue === opt
                        ? { backgroundColor: theme.color025 }
                        : {}
                    }
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        flex: 1,
                        textAlign: "left",
                        color:
                          singleValue === opt ? theme.color : theme.colorStrong,
                      }}
                    >
                      {capitalize(opt)}
                    </Text>
                    {singleValue === opt && (
                      <Check size={18} color={theme.color} />
                    )}
                  </Button>
                ))}

              {/* Multi select */}
              {editConfig.type === "multi" && (
                <>
                  {(editConfig.options ?? []).map((opt) => {
                    const selected = multiValues.includes(opt);
                    return (
                      <Button
                        key={opt}
                        variant="ghost"
                        onPress={() => toggleMulti(opt)}
                        className="w-full justify-between h-auto py-3.5 px-3 rounded-xl mb-0.5"
                        style={
                          selected ? { backgroundColor: theme.color025 } : {}
                        }
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            flex: 1,
                            textAlign: "left",
                            color: selected ? theme.color : theme.colorStrong,
                          }}
                        >
                          {capitalize(opt)}
                        </Text>
                        {selected && <Check size={18} color={theme.color} />}
                      </Button>
                    );
                  })}
                  <Button onPress={confirmEdit} className="w-full mt-4">
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                    >
                      Save
                    </Text>
                  </Button>
                </>
              )}

              {/* Text input */}
              {editConfig.type === "text" && (
                <>
                  <Textarea
                    value={textValue}
                    onChangeText={setTextValue}
                    placeholder="Type here…"
                    autoFocus
                    className="min-h-[100px]"
                  />
                  <Button onPress={confirmEdit} className="w-full mt-3">
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                    >
                      Save
                    </Text>
                  </Button>
                </>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* ── Bug report bottom sheet ───────────────────────────────────────── */}
      <BottomSheetModal
        ref={bugSheetRef}
        snapPoints={bugSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.backgroundPopover }}
        handleIndicatorStyle={{ backgroundColor: theme.gray5 }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.colorStrong,
              marginBottom: 12,
              marginTop: 4,
            }}
          >
            Report a bug
          </Text>
          <Textarea
            value={bugText}
            onChangeText={setBugText}
            placeholder="Describe what went wrong…"
            className="flex-1 max-h-[140px]"
          />
          <Button
            onPress={() => {
              setBugText("");
              bugSheetRef.current?.close();
            }}
            className="w-full mt-4 gap-2"
          >
            <Send size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Send report
            </Text>
          </Button>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ── Delete account alert ──────────────────────────────────────────── */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent and cannot be undone. All your data will
              be erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                setShowDeleteAlert(false);
                setUser(null);
              }}
              className="bg-destructive"
            >
              <Text className="text-white">Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
