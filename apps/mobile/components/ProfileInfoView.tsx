import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { User } from "@/types/user";
import {
  Baby,
  BookOpen,
  Briefcase,
  Camera,
  ChevronRight,
  Cigarette,
  Globe,
  Heart,
  PawPrint,
  Ruler,
  Star,
  Trash2,
  Users,
  Wine,
} from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function formatList(arr?: string[]) {
  return arr && arr.length > 0 ? arr.map(capitalize).join(", ") : undefined;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Pass this to make ProfileInfoView editable.
 * When omitted, the view is fully read-only.
 */
export type ProfileInfoEditCallbacks = {
  onAddPhoto(): void;
  onRemovePhoto(url: string): void;
  onEditTags(): void;
  onEditWork(): void;
  onEditEducation(): void;
  onEditLookingFor(): void;
  onEditBio(): void;
  onEditField(fieldKey: ProfileInfoFieldKey): void;
};

export type ProfileInfoFieldKey =
  | "height"
  | "children"
  | "drinking"
  | "languages"
  | "relationship"
  | "sexuality"
  | "smoking"
  | "starSign"
  | "pets"
  | "religion";

export type ProfileInfoField = {
  key: ProfileInfoFieldKey;
  icon: React.ComponentType<any>;
  label: string;
  value?: string;
};

type ProfileInfoViewProps = {
  user: Partial<User>;
  editCallbacks?: ProfileInfoEditCallbacks;
  profileFields?: ProfileInfoField[];
};

// ─── ProfileRow ───────────────────────────────────────────────────────────────

function ProfileRow({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between py-3"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: theme.backgroundMuted }}
        >
          <Icon size={16} color={theme.color} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: 12, color: theme.colorMuted }}>{label}</Text>
          <Text
            style={{
              fontSize: 15,
              marginTop: 2,
              color: value ? theme.colorStrong : theme.colorMuted,
            }}
          >
            {value ?? "—"}
          </Text>
        </View>
      </View>
      {onPress && <ChevronRight size={16} color={theme.gray5} />}
    </Pressable>
  );
}

// ─── ProfileInfoView ──────────────────────────────────────────────────────────

/**
 * Renders the profile info content (photos, bio, attributes, etc.).
 * Does NOT include its own scroll wrapper — wrap in ScrollView or
 * BottomSheetScrollView in the parent as needed.
 *
 * Pass `editCallbacks` to enable editable mode (chevrons + onPress).
 * Omit `editCallbacks` for a fully read-only view.
 */
export default function ProfileInfoView({
  user,
  editCallbacks,
  profileFields,
}: ProfileInfoViewProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const editable = !!editCallbacks;
  const resolvedProfileFields =
    profileFields ??
    ([
      {
        key: "height",
        icon: Ruler,
        label: t("height"),
        value: user.height ? `${user.height} cm` : undefined,
      },
      {
        key: "children",
        icon: Baby,
        label: t("children"),
        value: user.hasChildren ? capitalize(user.hasChildren) : undefined,
      },
      {
        key: "drinking",
        icon: Wine,
        label: t("drinking"),
        value: user.drinking ? capitalize(user.drinking) : undefined,
      },
      {
        key: "languages",
        icon: Globe,
        label: t("languages"),
        value: formatList(user.languages),
      },
      {
        key: "relationship",
        icon: Heart,
        label: t("relationship"),
        value: user.relationship ? capitalize(user.relationship) : undefined,
      },
      {
        key: "sexuality",
        icon: Users,
        label: t("sexuality"),
        value: user.sexuality ? capitalize(user.sexuality) : undefined,
      },
      {
        key: "smoking",
        icon: Cigarette,
        label: t("smoking"),
        value: user.smoking ? capitalize(user.smoking) : undefined,
      },
      {
        key: "starSign",
        icon: Star,
        label: t("starSign"),
        value: user.starSign,
      },
      {
        key: "pets",
        icon: PawPrint,
        label: t("pets"),
        value: formatList(user.pets),
      },
      {
        key: "religion",
        icon: Heart,
        label: t("religion"),
        value: user.religion ? capitalize(user.religion) : undefined,
      },
    ] satisfies ProfileInfoField[]);

  return (
    <View>
      {/* Photos */}
      <View className="px-4 pt-4">
        <Text
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colorMuted }}
        >
          {t("photos")}
        </Text>
        <View className="flex-row h-[200px] gap-1.5 mt-2">
          {/* Slot 0 — large left */}
          <View className="flex-1 relative">
            {user.photos?.[0] ? (
              <>
                <Image
                  source={{ uri: user.photos[0] }}
                  className="flex-1 rounded-xl"
                  contentFit="cover"
                  cachePolicy="disk"
                />
                {editable && (
                  <Pressable
                    onPress={() =>
                      editCallbacks!.onRemovePhoto(user.photos![0])
                    }
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                  >
                    <Trash2 size={13} color="#fff" />
                  </Pressable>
                )}
              </>
            ) : (
              <Pressable
                onPress={
                  editable && (user.photos?.length ?? 0) < 3
                    ? editCallbacks!.onAddPhoto
                    : undefined
                }
                disabled={!editable}
                className="flex-1 rounded-xl items-center justify-center"
                style={{ backgroundColor: theme.backgroundMuted }}
              >
                {editable ? (
                  <Camera size={26} color={theme.colorMuted} />
                ) : (
                  <Text style={{ color: theme.colorMuted, fontSize: 28 }}>
                    —
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Slots 1 & 2 — right column */}
          <View className="flex-1 gap-1.5">
            {[1, 2].map((idx) => (
              <View key={idx} className="flex-1 relative">
                {user.photos?.[idx] ? (
                  <>
                    <Image
                      source={{ uri: user.photos[idx] }}
                      className="flex-1 rounded-xl"
                      contentFit="cover"
                      cachePolicy="disk"
                    />
                    {editable && (
                      <Pressable
                        onPress={() =>
                          editCallbacks!.onRemovePhoto(user.photos![idx])
                        }
                        className="absolute top-1 right-1 w-6 h-6 rounded-full items-center justify-center"
                        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
                      >
                        <Trash2 size={11} color="#fff" />
                      </Pressable>
                    )}
                  </>
                ) : (
                  <Pressable
                    onPress={
                      editable && (user.photos?.length ?? 0) < 3
                        ? editCallbacks!.onAddPhoto
                        : undefined
                    }
                    disabled={!editable}
                    className="flex-1 rounded-xl items-center justify-center"
                    style={{ backgroundColor: theme.backgroundMuted }}
                  >
                    {editable ? (
                      <Camera size={18} color={theme.colorMuted} />
                    ) : (
                      <Text style={{ color: theme.colorMuted, fontSize: 22 }}>
                        —
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Name / Gender / Location block */}
      <View
        className="mx-4 mt-4 rounded-2xl p-4"
        style={{ backgroundColor: theme.backgroundMuted }}
      >
        <Text
          style={{ fontSize: 20, fontWeight: "700", color: theme.colorStrong }}
        >
          {user.firstName}
          {user.age ? `, ${user.age}` : ""}
        </Text>
        <Text style={{ fontSize: 14, color: theme.colorMuted, marginTop: 2 }}>
          {capitalize(user.gender ?? "")}
          {user.gender && user.location ? ", " : ""}
          {user.location}
        </Text>
      </View>

      <Separator className="mx-4 mt-3" />

      {/* Interests */}
      <Pressable
        onPress={editCallbacks?.onEditTags}
        disabled={!editable}
        className="mx-4 mt-3 pb-3"
      >
        <Text
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colorMuted }}
        >
          {t("interests")}
        </Text>
        <View className="flex-row flex-wrap gap-2 mt-2">
          {(user.tags ?? []).map((tag, i) => (
            <View
              key={i}
              className="rounded-full px-3 py-1"
              style={{ backgroundColor: theme.color025 }}
            >
              <Text style={{ fontSize: 13, color: theme.color }}>{tag}</Text>
            </View>
          ))}
          {(user.tags ?? []).length === 0 && (
            <Text style={{ fontSize: 14, color: theme.colorMuted }}>
              {editable ? t("addInterests") : "—"}
            </Text>
          )}
        </View>
      </Pressable>

      <Separator className="mx-4" />

      {/* Work & Education */}
      <View className="mx-4 mt-1">
        <Text
          className="text-xs font-semibold uppercase tracking-wide mb-1"
          style={{ color: theme.colorMuted }}
        >
          {t("workAndEducation")}
        </Text>
        <ProfileRow
          icon={Briefcase}
          label={t("work")}
          value={user.work}
          onPress={editCallbacks?.onEditWork}
        />
        <Separator />
        <ProfileRow
          icon={BookOpen}
          label={t("education")}
          value={user.education}
          onPress={editCallbacks?.onEditEducation}
        />
      </View>

      <Separator className="mx-4 mt-1" />

      {/* Why you're here */}
      <Pressable
        onPress={editCallbacks?.onEditLookingFor}
        disabled={!editable}
        className="mx-4 mt-3 pb-3"
      >
        <Text
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colorMuted }}
        >
          {t("whyYoureHere")}
        </Text>
        <View className="flex-row flex-wrap gap-2 mt-2">
          {(user.lookingFor ?? []).map((item, i) => (
            <View
              key={i}
              className="rounded-full px-3.5 py-1.5"
              style={{ backgroundColor: theme.color }}
            >
              <Text style={{ fontSize: 13, color: "#fff" }}>
                {capitalize(item)}
              </Text>
            </View>
          ))}
          {(user.lookingFor ?? []).length === 0 && (
            <Text style={{ fontSize: 14, color: theme.colorMuted }}>
              {editable ? t("select") : "—"}
            </Text>
          )}
        </View>
      </Pressable>

      <Separator className="mx-4" />

      {/* Bio */}
      <Pressable
        onPress={editCallbacks?.onEditBio}
        disabled={!editable}
        className="mx-4 mt-3 pb-3"
      >
        <Text
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: theme.colorMuted }}
        >
          {t("bio")}
        </Text>
        <Text
          style={{
            fontSize: 15,
            marginTop: 4,
            lineHeight: 22,
            color: user.info ? theme.colorStrong : theme.colorMuted,
          }}
        >
          {user.info ?? (editable ? t("tellOthersAboutYourself") : "—")}
        </Text>
      </Pressable>

      <Separator className="mx-4" />

      {/* Attribute rows */}
      <View className="mx-4 mt-1">
        {resolvedProfileFields.map((field, index) => (
          <React.Fragment key={`${field.key}-${index}`}>
            <ProfileRow
              icon={field.icon}
              label={field.label}
              value={field.value}
              onPress={
                editCallbacks
                  ? () => editCallbacks.onEditField(field.key)
                  : undefined
              }
            />
            {index < resolvedProfileFields.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
