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
import { updateSettings, uploadGuestPhoto, deleteGuestPhoto } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
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
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type EditConfig = {
  title: string;
  type: "single" | "multi" | "text";
  options?: { name: string; value: string }[];
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
  const { t } = useTranslation();
  const { user, settings, setUser, setSettings } = useStore();

  // ─── Translated option arrays ───────────────────────────────────────────────
  const LOOKING_FOR_OPTIONS = [
    { name: t("toDate"), value: "to date" },
    { name: t("toParty"), value: "to party" },
    { name: t("openToChat"), value: "open to chat" },
    { name: t("readyForRelationship"), value: "ready for a relationship" },
  ];
  const LIFESTYLE_OPTS = [
    { name: t("never"), value: "never" },
    { name: t("socially"), value: "socially" },
    { name: t("regularly"), value: "regularly" },
    { name: t("preferNotToSay"), value: "prefer not to say" },
  ];
  const DRINKING_OPTIONS = LIFESTYLE_OPTS;
  const SMOKING_OPTIONS = LIFESTYLE_OPTS;
  const CHILDREN_OPTIONS = [
    { name: t("no"), value: "no" },
    { name: t("yes"), value: "yes" },
    { name: t("preferNotToSay"), value: "prefer not to say" },
  ];
  const RELATIONSHIP_OPTIONS = [
    { name: t("single"), value: "single" },
    { name: t("divorced"), value: "divorced" },
    { name: t("separated"), value: "separated" },
    { name: t("preferNotToSay"), value: "prefer not to say" },
  ];
  const SEXUALITY_OPTIONS = [
    { name: t("straight"), value: "straight" },
    { name: t("gay"), value: "gay" },
    { name: t("bisexual"), value: "bisexual" },
    { name: t("preferNotToSay"), value: "prefer not to say" },
  ];
  const STAR_SIGN_OPTIONS = [
    { name: t("aries"), value: "Aries" },
    { name: t("taurus"), value: "Taurus" },
    { name: t("gemini"), value: "Gemini" },
    { name: t("cancer"), value: "Cancer" },
    { name: t("leo"), value: "Leo" },
    { name: t("virgo"), value: "Virgo" },
    { name: t("libra"), value: "Libra" },
    { name: t("scorpio"), value: "Scorpio" },
    { name: t("sagittarius"), value: "Sagittarius" },
    { name: t("capricorn"), value: "Capricorn" },
    { name: t("aquarius"), value: "Aquarius" },
    { name: t("pisces"), value: "Pisces" },
  ];
  const RELIGION_OPTIONS = [
    { name: t("atheist"), value: "atheist" },
    { name: t("agnostic"), value: "agnostic" },
    { name: t("christian"), value: "christian" },
    { name: t("muslim"), value: "muslim" },
    { name: t("jewish"), value: "jewish" },
    { name: t("buddhist"), value: "buddhist" },
    { name: t("hindu"), value: "hindu" },
    { name: t("other"), value: "other" },
    { name: t("preferNotToSay"), value: "prefer not to say" },
  ];
  const PETS_OPTIONS = [
    { name: t("cat"), value: "cat" },
    { name: t("dog"), value: "dog" },
    { name: t("fish"), value: "fish" },
    { name: t("bird"), value: "bird" },
    { name: t("none"), value: "none" },
  ];
  const LANGUAGE_OPTIONS = [
    { name: t("english"), value: "English" },
    { name: t("serbian"), value: "Serbian" },
    { name: t("russian"), value: "Russian" },
    { name: t("spanish"), value: "Spanish" },
    { name: t("french"), value: "French" },
    { name: t("german"), value: "German" },
  ];
  const TAGS_OPTIONS = [
    { name: t("photography"), value: "Photography" },
    { name: t("travel"), value: "Travel" },
    { name: t("yoga"), value: "Yoga" },
    { name: t("music"), value: "Music" },
    { name: t("coffee"), value: "Coffee" },
    { name: t("art"), value: "Art" },
    { name: t("dancing"), value: "Dancing" },
    { name: t("hiking"), value: "Hiking" },
    { name: t("food"), value: "Food" },
    { name: t("tech"), value: "Tech" },
    { name: t("fitness"), value: "Fitness" },
    { name: t("reading"), value: "Reading" },
    { name: t("movies"), value: "Movies" },
    { name: t("gaming"), value: "Gaming" },
    { name: t("fashion"), value: "Fashion" },
  ];
  const VENUE_OPTIONS: { name: string; value: VenueType }[] = [
    { name: t("bar"), value: "bar" },
    { name: t("pub"), value: "pub" },
    { name: t("nightclub"), value: "nightclub" },
    { name: t("restaurant"), value: "restaurant" },
    { name: t("cafe"), value: "cafe" },
    { name: t("cocktailBar"), value: "cocktail_bar" },
    { name: t("wineBar"), value: "wine_bar" },
    { name: t("brewery"), value: "brewery" },
    { name: t("tavern"), value: "tavern" },
    { name: t("raft"), value: "raft" },
  ];
  const THEME_OPTIONS = [
    { name: t("light"), value: "light" },
    { name: t("dark"), value: "dark" },
    { name: t("system"), value: "system" },
  ];
  const APP_LANGUAGE_OPTIONS = [
    { name: t("english"), value: "EN" },
    { name: t("serbian"), value: "RS" },
    { name: t("russian"), value: "RU" },
  ];
  const { userId, signOut } = useAuth();
  const insets = useSafeAreaInsets();

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
    options: { name: string; value: string }[],
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
    options: { name: string; value: string }[],
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

  // ── Photo callbacks ─────────────────────────────────────────────────────────

  const handleAddPhoto = async () => {
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
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
    try {
      const updatedUrls = await uploadGuestPhoto(
        userId,
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );
      patchUser({ photos: updatedUrls, imgUrl: updatedUrls[0] });
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const handleRemovePhoto = async (url: string) => {
    if (!userId) return;
    try {
      const updatedUrls = await deleteGuestPhoto(userId, url);
      patchUser({ photos: updatedUrls, imgUrl: updatedUrls[0] });
    } catch (err) {
      Alert.alert(
        "Remove failed",
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  const patchSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (userId && (patch.language !== undefined || patch.theme !== undefined)) {
      const remote: Record<string, string> = {};
      if (patch.language !== undefined) remote.language = patch.language;
      if (patch.theme !== undefined) remote.theme = patch.theme;
      updateSettings(userId, remote).catch(console.error);
    }
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

  if (!user)
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
                {t("profile")}
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
                {t("settings")}
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
                  onAddPhoto: () => {
                    void handleAddPhoto();
                  },
                  onRemovePhoto: (url) => {
                    void handleRemovePhoto(url);
                  },
                  onEditTags: () =>
                    openMultiSelect(
                      t("tags"),
                      TAGS_OPTIONS,
                      user.tags ?? [],
                      (v) => patchUser({ tags: v as string[] }),
                    ),
                  onEditWork: () =>
                    openTextEdit(t("work"), user.work ?? "", (v) =>
                      patchUser({ work: v }),
                    ),
                  onEditEducation: () =>
                    openTextEdit(t("education"), user.education ?? "", (v) =>
                      patchUser({ education: v }),
                    ),
                  onEditLookingFor: () =>
                    openMultiSelect(
                      t("whyYoureHere"),
                      LOOKING_FOR_OPTIONS,
                      user.lookingFor ?? [],
                      (v) => patchUser({ lookingFor: v as any }),
                    ),
                  onEditBio: () =>
                    openTextEdit(t("bio"), user.info ?? "", (v) =>
                      patchUser({ info: v }),
                    ),
                  onEditHeight: () =>
                    openTextEdit(
                      t("heightCm"),
                      user.height?.toString() ?? "",
                      (v) =>
                        patchUser({ height: parseInt(v, 10) || undefined }),
                    ),
                  onEditChildren: () =>
                    openSingleSelect(
                      t("children"),
                      CHILDREN_OPTIONS,
                      user.hasChildren ?? "",
                      (v) => patchUser({ hasChildren: v as any }),
                    ),
                  onEditDrinking: () =>
                    openSingleSelect(
                      t("drinking"),
                      DRINKING_OPTIONS,
                      user.drinking ?? "",
                      (v) => patchUser({ drinking: v as any }),
                    ),
                  onEditLanguages: () =>
                    openMultiSelect(
                      t("languages"),
                      LANGUAGE_OPTIONS,
                      user.languages ?? [],
                      (v) => patchUser({ languages: v as string[] }),
                    ),
                  onEditRelationship: () =>
                    openSingleSelect(
                      t("relationshipStatus"),
                      RELATIONSHIP_OPTIONS,
                      user.relationship ?? "",
                      (v) => patchUser({ relationship: v as any }),
                    ),
                  onEditSexuality: () =>
                    openSingleSelect(
                      t("sexuality"),
                      SEXUALITY_OPTIONS,
                      user.sexuality ?? "",
                      (v) => patchUser({ sexuality: v as any }),
                    ),
                  onEditSmoking: () =>
                    openSingleSelect(
                      t("smoking"),
                      SMOKING_OPTIONS,
                      user.smoking ?? "",
                      (v) => patchUser({ smoking: v as any }),
                    ),
                  onEditStarSign: () =>
                    openSingleSelect(
                      t("starSign"),
                      STAR_SIGN_OPTIONS,
                      user.starSign ?? "",
                      (v) => patchUser({ starSign: v as any }),
                    ),
                  onEditPets: () =>
                    openMultiSelect(
                      t("pets"),
                      PETS_OPTIONS,
                      user.pets ?? [],
                      (v) => patchUser({ pets: v as string[] }),
                    ),
                  onEditReligion: () =>
                    openSingleSelect(
                      t("religion"),
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
                  title={t("theme")}
                  subtitle={t(settings.theme.toLowerCase() as any)}
                  onPress={() =>
                    openSingleSelect(
                      t("theme"),
                      THEME_OPTIONS,
                      settings.theme,
                      (v) => patchSettings({ theme: v as any }),
                    )
                  }
                />
                <Separator />
                <SettingsRow
                  icon={Bell}
                  title={t("notifications")}
                  subtitle={settings.notificationsEnabled ? t("on") : t("off")}
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
                  title={t("language")}
                  subtitle={
                    settings.language === "EN"
                      ? t("english")
                      : settings.language === "RS"
                        ? t("serbian")
                        : t("russian")
                  }
                  onPress={() =>
                    openSingleSelect(
                      t("language"),
                      APP_LANGUAGE_OPTIONS,
                      settings.language,
                      (v) => patchSettings({ language: v as any }),
                    )
                  }
                />
                <Separator />
                <SettingsRow
                  icon={MapPin}
                  title={t("location")}
                  subtitle="Belgrade"
                  onPress={undefined}
                  right={<View />}
                />
                <Separator />
                <SettingsRow
                  icon={MapPin}
                  title={t("defaultVenueType")}
                  subtitle={
                    VENUE_OPTIONS.find(
                      (v) => v.value === settings.defaultVenueType,
                    )?.name ?? t("notSet")
                  }
                  onPress={() =>
                    openSingleSelect(
                      t("defaultVenueType"),
                      VENUE_OPTIONS,
                      settings.defaultVenueType ?? "",
                      (v) =>
                        patchSettings({ defaultVenueType: v as VenueType }),
                    )
                  }
                />
                <Separator />
                <SettingsRow
                  icon={Bug}
                  title={t("reportBug")}
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
                    {t("logOut")}
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
                    {t("deleteAccount")}
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
                    key={opt.value}
                    variant="ghost"
                    onPress={() => {
                      setSingleValue(opt.value);
                      editConfig.onSave(opt.value);
                      editSheetRef.current?.close();
                      setEditConfig(null);
                    }}
                    className="w-full justify-between h-auto py-3.5 px-3 rounded-xl mb-0.5"
                    style={
                      singleValue === opt.value
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
                          singleValue === opt.value
                            ? theme.color
                            : theme.colorStrong,
                      }}
                    >
                      {opt.name}
                    </Text>
                    {singleValue === opt.value && (
                      <Check size={18} color={theme.color} />
                    )}
                  </Button>
                ))}

              {/* Multi select */}
              {editConfig.type === "multi" && (
                <>
                  {(editConfig.options ?? []).map((opt) => {
                    const selected = multiValues.includes(opt.value);
                    return (
                      <Button
                        key={opt.value}
                        variant="ghost"
                        onPress={() => toggleMulti(opt.value)}
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
                          {opt.name}
                        </Text>
                        {selected && <Check size={18} color={theme.color} />}
                      </Button>
                    );
                  })}
                  <Button onPress={confirmEdit} className="w-full mt-4">
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                    >
                      {t("confirm")}
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
                    placeholder={t("bio") + "…"}
                    autoFocus
                    className="min-h-[100px]"
                  />
                  <Button onPress={confirmEdit} className="w-full mt-3">
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                    >
                      {t("confirm")}
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
            {t("reportBug")}
          </Text>
          <Textarea
            value={bugText}
            onChangeText={setBugText}
            placeholder={t("bugReportPlaceholder")}
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
              {t("send")}
            </Text>
          </Button>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ── Delete account alert ──────────────────────────────────────────── */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAlertTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteAlertDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t("cancel")}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                setShowDeleteAlert(false);
                setUser(null);
              }}
              className="bg-destructive"
            >
              <Text className="text-white">{t("confirm")}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
