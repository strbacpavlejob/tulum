import Blob from "@/components/Blob";
import LoadingIndicator from "@/components/loading-indicator";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  deleteGuestPhoto,
  updateSettings,
  uploadGuestPhoto,
  submitBugReport,
  submitVenueSuggestion,
} from "@/lib/api";
import useStore from "@/store/useStore";
import { VenueType } from "@/types/filter";
import { Settings } from "@/types/settings";
import { User } from "@/types/user";
import { useAuth } from "@clerk/expo";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  Baby,
  Cigarette,
  Check,
  Globe,
  Heart,
  PawPrint,
  Ruler,
  Send,
  Star,
  Users,
  Wine,
} from "lucide-react-native";
import type {
  ProfileInfoField,
  ProfileInfoFieldKey,
} from "@/components/ProfileInfoView";
import {
  appLanguageOptions,
  EditConfig,
  SelectOption,
  childrenOptions,
  drinkingOptions,
  languageOptions,
  lookingForOptions,
  petsOptions,
  relationshipOptions,
  religionOptions,
  sexualityOptions,
  smokingOptions,
  starSignOptions,
  tagsOptions,
  themeOptions,
  venueOptions,
} from "@/constants/options";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import SettingsTab from "@/components/SettingsTab";
import ProfileTab from "@/components/ProfileTab";
import { cn } from "@/lib/utils";

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { user, settings, setUser, setSettings } = useStore();

  const { userId, signOut, getToken } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");

  const [editConfig, setEditConfig] = useState<EditConfig | null>(null);

  const [singleValue, setSingleValue] = useState("");
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [textValue, setTextValue] = useState("");

  const [bugText, setBugText] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueInstagram, setVenueInstagram] = useState("");
  const [venueNotes, setVenueNotes] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const editSheetRef = useRef<BottomSheetModal>(null);
  const bugSheetRef = useRef<BottomSheetModal>(null);
  const venueSheetRef = useRef<BottomSheetModal>(null);

  const editSnapPoints = useMemo(() => ["50%", "85%"], []);

  const bugSnapPoints = useMemo(() => ["45%"], []);
  const venueSnapPoints = useMemo(() => ["55%"], []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const openSingleSelect = (
    title: string,
    options: SelectOption[],
    current: string,
    onSave: (value: string) => void,
  ) => {
    setSingleValue(current);

    setEditConfig({
      title,
      type: "single",
      options,
      onSave: (value) => {
        onSave(value as string);
      },
    });

    editSheetRef.current?.present();
  };

  const openMultiSelect = (
    title: string,
    options: SelectOption[],
    current: string[],
    onSave: (value: string[]) => void,
  ) => {
    setMultiValues([...current]);

    setEditConfig({
      title,
      type: "multi",
      options,
      onSave: (value) => {
        onSave(value as string[]);
      },
    });

    editSheetRef.current?.present();
  };

  const openTextEdit = (
    title: string,
    current: string,
    onSave: (value: string) => void,
  ) => {
    setTextValue(current);

    setEditConfig({
      title,
      type: "text",
      onSave: (value) => {
        onSave(value as string);
      },
    });

    editSheetRef.current?.present();
  };

  const patchUser = (patch: Partial<User>) => {
    if (!user) {
      return;
    }

    setUser({
      ...user,
      ...patch,
    });
  };

  const patchSettings = async (patch: Partial<Settings>) => {
    const nextSettings = {
      ...settings,
      ...patch,
    };

    setSettings(nextSettings);

    const shouldUpdateRemote =
      patch.language !== undefined || patch.theme !== undefined;

    if (!userId || !shouldUpdateRemote) {
      return;
    }

    const token = await getToken();

    if (!token) {
      return;
    }

    const remoteSettings: Record<string, string> = {};

    if (patch.language !== undefined) {
      remoteSettings.language = patch.language;
    }

    if (patch.theme !== undefined) {
      remoteSettings.theme = patch.theme;
    }

    try {
      await updateSettings(token, userId, remoteSettings);
    } catch (error) {
      console.error("Failed to update settings", error);
    }
  };

  const handleAddPhoto = async () => {
    if (!userId) {
      return;
    }

    const token = await getToken();

    if (!token) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== "granted") {
      Alert.alert(
        t("permissionRequired"),
        t("photoLibraryPermissionDescription"),
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];

    try {
      const updatedUrls = await uploadGuestPhoto(
        token,
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );

      patchUser({
        photos: updatedUrls,
        imgUrl: updatedUrls[0],
      });
    } catch (error) {
      Alert.alert(
        t("uploadFailed"),
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const handleRemovePhoto = async (url: string) => {
    if (!userId) {
      return;
    }

    const token = await getToken();

    if (!token) {
      return;
    }

    try {
      const updatedUrls = await deleteGuestPhoto(token, url);

      patchUser({
        photos: updatedUrls,
        imgUrl: updatedUrls[0],
      });
    } catch (error) {
      Alert.alert(
        t("removeFailed"),
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const confirmEdit = () => {
    if (!editConfig) {
      return;
    }

    if (editConfig.type === "single") {
      editConfig.onSave(singleValue);
    }

    if (editConfig.type === "multi") {
      editConfig.onSave(multiValues);
    }

    if (editConfig.type === "text") {
      editConfig.onSave(textValue);
    }

    editSheetRef.current?.close();
    setEditConfig(null);
  };

  const toggleMultiValue = (value: string) => {
    setMultiValues((currentValues) => {
      if (currentValues.includes(value)) {
        return currentValues.filter((currentValue) => currentValue !== value);
      }

      return [...currentValues, value];
    });
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);

    router.replace("/(auth)/sign-in");
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
        <LoadingIndicator />
      </View>
    );
  }

  const profileFields: ProfileInfoField[] = [
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
      value: user.hasChildren
        ? user.hasChildren.charAt(0).toUpperCase() + user.hasChildren.slice(1)
        : undefined,
    },
    {
      key: "drinking",
      icon: Wine,
      label: t("drinking"),
      value: user.drinking
        ? user.drinking.charAt(0).toUpperCase() + user.drinking.slice(1)
        : undefined,
    },
    {
      key: "languages",
      icon: Globe,
      label: t("languages"),
      value:
        user.languages && user.languages.length > 0
          ? user.languages
              .map(
                (language) =>
                  language.charAt(0).toUpperCase() + language.slice(1),
              )
              .join(", ")
          : undefined,
    },
    {
      key: "relationship",
      icon: Heart,
      label: t("relationship"),
      value: user.relationship
        ? user.relationship.charAt(0).toUpperCase() + user.relationship.slice(1)
        : undefined,
    },
    {
      key: "sexuality",
      icon: Users,
      label: t("sexuality"),
      value: user.sexuality
        ? user.sexuality.charAt(0).toUpperCase() + user.sexuality.slice(1)
        : undefined,
    },
    {
      key: "smoking",
      icon: Cigarette,
      label: t("smoking"),
      value: user.smoking
        ? user.smoking.charAt(0).toUpperCase() + user.smoking.slice(1)
        : undefined,
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
      value:
        user.pets && user.pets.length > 0
          ? user.pets
              .map((pet) => pet.charAt(0).toUpperCase() + pet.slice(1))
              .join(", ")
          : undefined,
    },
    {
      key: "religion",
      icon: Heart,
      label: t("religion"),
      value: user.religion
        ? user.religion.charAt(0).toUpperCase() + user.religion.slice(1)
        : undefined,
    },
  ];

  const handleEditProfileField = (fieldKey: ProfileInfoFieldKey) => {
    switch (fieldKey) {
      case "height": {
        openTextEdit(t("heightCm"), user.height?.toString() ?? "", (value) => {
          const parsedHeight = Number.parseInt(value, 10);

          patchUser({
            height: Number.isNaN(parsedHeight) ? undefined : parsedHeight,
          });
        });
        break;
      }

      case "children": {
        openSingleSelect(
          t("children"),
          childrenOptions,
          user.hasChildren ?? "",
          (value) => {
            patchUser({
              hasChildren: value as User["hasChildren"],
            });
          },
        );
        break;
      }

      case "drinking": {
        openSingleSelect(
          t("drinking"),
          drinkingOptions,
          user.drinking ?? "",
          (value) => {
            patchUser({
              drinking: value as User["drinking"],
            });
          },
        );
        break;
      }

      case "languages": {
        openMultiSelect(
          t("languages"),
          languageOptions,
          user.languages ?? [],
          (value) => {
            patchUser({
              languages: value,
            });
          },
        );
        break;
      }

      case "relationship": {
        openSingleSelect(
          t("relationshipStatus"),
          relationshipOptions,
          user.relationship ?? "",
          (value) => {
            patchUser({
              relationship: value as User["relationship"],
            });
          },
        );
        break;
      }

      case "sexuality": {
        openSingleSelect(
          t("sexuality"),
          sexualityOptions,
          user.sexuality ?? "",
          (value) => {
            patchUser({
              sexuality: value as User["sexuality"],
            });
          },
        );
        break;
      }

      case "smoking": {
        openSingleSelect(
          t("smoking"),
          smokingOptions,
          user.smoking ?? "",
          (value) => {
            patchUser({
              smoking: value as User["smoking"],
            });
          },
        );
        break;
      }

      case "starSign": {
        openSingleSelect(
          t("starSign"),
          starSignOptions,
          user.starSign ?? "",
          (value) => {
            patchUser({
              starSign: value as User["starSign"],
            });
          },
        );
        break;
      }

      case "pets": {
        openMultiSelect(t("pets"), petsOptions, user.pets ?? [], (value) => {
          patchUser({
            pets: value,
          });
        });
        break;
      }

      case "religion": {
        openSingleSelect(
          t("religion"),
          religionOptions,
          user.religion ?? "",
          (value) => {
            patchUser({
              religion: value as User["religion"],
            });
          },
        );
        break;
      }
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1"
      style={{
        backgroundColor: theme.backgroundFocus,
      }}
    >
      <View className="flex-1 items-center justify-center px-5">
        <View className="absolute inset-0" pointerEvents="none">
          <Blob width="100%" color="rgba(255,255,255,0.12)" />
        </View>

        <View className="items-center gap-2.5">
          <Avatar alt="Your avatar" className="h-20 w-20">
            <AvatarImage
              source={{
                uri: user.imgUrl,
              }}
            />
          </Avatar>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {user.firstName}, {user.age}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 4,
            }}
          >
            <Tags tags={user.tags ?? []} />
          </ScrollView>
        </View>
      </View>

      <View
        className="overflow-hidden rounded-t-[32px]"
        style={{
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -8,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="h-12 w-full rounded-none border-b px-0 py-0 bg-light-background dark:bg-dark-background border-b-light-border dark:border-b-dark-border">
            <TabsTrigger
              value="profile"
              className={`h-full flex-1 rounded-none ${activeTab === "profile" ? "border-b-2 border-b-light-color dark:border-b-dark-color" : ""}`}
            >
              <Text
                className={cn(
                  "text-sm",
                  activeTab === "profile"
                    ? "font-semibold text-light-color dark:text-dark-color"
                    : "font-normal text-light-colorMuted dark:text-dark-colorMuted",
                )}
              >
                {t("profile")}
              </Text>
            </TabsTrigger>

            <TabsTrigger
              value="settings"
              className={`h-full flex-1 rounded-none ${activeTab === "settings" ? "border-b-2 border-b-light-color dark:border-b-dark-color" : ""}`}
            >
              <Text
                className={cn(
                  "text-sm",
                  activeTab === "settings"
                    ? "font-semibold text-light-color dark:text-dark-color"
                    : "font-normal text-light-colorMuted dark:text-dark-colorMuted",
                )}
              >
                {t("settings")}
              </Text>
            </TabsTrigger>
          </TabsList>

          <ProfileTab
            user={user}
            profileFields={profileFields}
            editCallbacks={{
              onAddPhoto: () => {
                void handleAddPhoto();
              },

              onRemovePhoto: (url) => {
                void handleRemovePhoto(url);
              },

              onEditTags: () => {
                openMultiSelect(
                  t("tags"),
                  tagsOptions,
                  user.tags ?? [],
                  (value) => {
                    patchUser({
                      tags: value,
                    });
                  },
                );
              },

              onEditWork: () => {
                openTextEdit(t("work"), user.work ?? "", (value) => {
                  patchUser({
                    work: value,
                  });
                });
              },

              onEditEducation: () => {
                openTextEdit(t("education"), user.education ?? "", (value) => {
                  patchUser({
                    education: value,
                  });
                });
              },

              onEditLookingFor: () => {
                openMultiSelect(
                  t("whyYoureHere"),
                  lookingForOptions,
                  user.lookingFor ?? [],
                  (value) => {
                    patchUser({
                      lookingFor: value as User["lookingFor"],
                    });
                  },
                );
              },

              onEditBio: () => {
                openTextEdit(t("bio"), user.info ?? "", (value) => {
                  patchUser({
                    info: value,
                  });
                });
              },

              onEditField: (fieldKey) => {
                handleEditProfileField(fieldKey);
              },
            }}
          />

          <SettingsTab
            settings={settings}
            venueOptions={venueOptions}
            locationName="Belgrade"
            onThemePress={() => {
              openSingleSelect(
                t("theme"),
                themeOptions,
                settings.theme,
                (value) => {
                  void patchSettings({
                    theme: value as Settings["theme"],
                  });
                },
              );
            }}
            onNotificationsChange={(enabled) => {
              void patchSettings({
                notificationsEnabled: enabled,
              });
            }}
            onLanguagePress={() => {
              openSingleSelect(
                t("language"),
                appLanguageOptions,
                settings.language,
                (value) => {
                  void patchSettings({
                    language: value as Settings["language"],
                  });
                },
              );
            }}
            onVenueTypePress={() => {
              openSingleSelect(
                t("defaultVenueType"),
                venueOptions,
                settings.defaultVenueType ?? "",
                (value) => {
                  void patchSettings({
                    defaultVenueType: value as VenueType,
                  });
                },
              );
            }}
            onReportBugPress={() => {
              bugSheetRef.current?.present();
            }}
            onSuggestVenuePress={() => {
              venueSheetRef.current?.present();
            }}
            onLogout={handleLogout}
            onDeleteAccountPress={() => {
              setShowDeleteAlert(true);
            }}
          />
        </Tabs>
      </View>

      <BottomSheetModal
        ref={editSheetRef}
        snapPoints={editSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.backgroundPopover,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.gray5,
        }}
        onDismiss={() => {
          setEditConfig(null);
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {editConfig ? (
            <>
              <Text
                style={{
                  marginTop: 4,
                  marginBottom: 16,
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.colorStrong,
                }}
              >
                {editConfig.title}
              </Text>

              {editConfig.type === "single"
                ? (editConfig.options ?? []).map((option) => {
                    const selected = singleValue === option.value;

                    return (
                      <Button
                        key={option.value}
                        variant="ghost"
                        onPress={() => {
                          setSingleValue(option.value);
                          editConfig.onSave(option.value);
                          editSheetRef.current?.close();
                          setEditConfig(null);
                        }}
                        className="mb-0.5 h-auto w-full justify-between rounded-xl px-3 py-3.5"
                        style={
                          selected
                            ? {
                                backgroundColor: theme.color025,
                              }
                            : undefined
                        }
                      >
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "left",
                            fontSize: 16,
                            color: selected ? theme.color : theme.colorStrong,
                          }}
                        >
                          {t(option.name)}
                        </Text>

                        {selected ? (
                          <Check size={18} color={theme.color} />
                        ) : null}
                      </Button>
                    );
                  })
                : null}

              {editConfig.type === "multi" ? (
                <>
                  {(editConfig.options ?? []).map((option) => {
                    const selected = multiValues.includes(option.value);

                    return (
                      <Button
                        key={option.value}
                        variant="ghost"
                        onPress={() => {
                          toggleMultiValue(option.value);
                        }}
                        className="mb-0.5 h-auto w-full justify-between rounded-xl px-3 py-3.5"
                        style={
                          selected
                            ? {
                                backgroundColor: theme.color025,
                              }
                            : undefined
                        }
                      >
                        <Text
                          style={{
                            flex: 1,
                            textAlign: "left",
                            fontSize: 16,
                            color: selected ? theme.color : theme.colorStrong,
                          }}
                        >
                          {t(option.name)}
                        </Text>

                        {selected ? (
                          <Check size={18} color={theme.color} />
                        ) : null}
                      </Button>
                    );
                  })}

                  <Button onPress={confirmEdit} className="mt-4 w-full">
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#fff",
                      }}
                    >
                      {t("confirm")}
                    </Text>
                  </Button>
                </>
              ) : null}

              {editConfig.type === "text" ? (
                <>
                  <Textarea
                    value={textValue}
                    onChangeText={setTextValue}
                    placeholder={`${editConfig.title}…`}
                    autoFocus
                    className="min-h-[100px]"
                  />

                  <Button onPress={confirmEdit} className="mt-3 w-full">
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#fff",
                      }}
                    >
                      {t("confirm")}
                    </Text>
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={bugSheetRef}
        snapPoints={bugSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.backgroundPopover,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.gray5,
        }}
      >
        <BottomSheetView
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <Text
            style={{
              marginTop: 4,
              marginBottom: 12,
              fontSize: 18,
              fontWeight: "700",
              color: theme.colorStrong,
            }}
          >
            {t("reportBug")}
          </Text>

          <Textarea
            value={bugText}
            onChangeText={setBugText}
            placeholder={t("bugReportPlaceholder")}
            className="max-h-[140px] flex-1"
          />

          <Button
            onPress={async () => {
              const token = await getToken();

              try {
                await submitBugReport(token ?? undefined, {
                  description: bugText,
                  additional_info: null,
                });

                setBugText("");
                bugSheetRef.current?.close();
              } catch (error) {
                Alert.alert(
                  t("sendFailed"),
                  error instanceof Error ? error.message : String(error),
                );
              }
            }}
            className="mt-4 w-full gap-2"
          >
            <Send size={16} color="#fff" />

            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#fff",
              }}
            >
              {t("send")}
            </Text>
          </Button>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={venueSheetRef}
        snapPoints={venueSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.backgroundPopover,
        }}
        handleIndicatorStyle={{
          backgroundColor: theme.gray5,
        }}
      >
        <BottomSheetView
          style={{
            flex: 1,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
        >
          <Text
            style={{
              marginTop: 4,
              marginBottom: 12,
              fontSize: 18,
              fontWeight: "700",
              color: theme.colorStrong,
            }}
          >
            {t("suggestVenue")}
          </Text>

          <Textarea
            value={venueName}
            onChangeText={setVenueName}
            placeholder={t("venueNamePlaceholder")}
            className="mb-2"
          />

          <Textarea
            value={venueInstagram}
            onChangeText={setVenueInstagram}
            placeholder={t("instagramHandlePlaceholder")}
            className="mb-2"
          />

          <Textarea
            value={venueNotes}
            onChangeText={setVenueNotes}
            placeholder={t("additionalInfoPlaceholder")}
            className="max-h-[140px] flex-1"
          />

          <Button
            onPress={async () => {
              if (!venueName.trim()) {
                Alert.alert(t("nameRequired"), t("pleaseProvideVenueName"));
                return;
              }

              const token = await getToken();

              try {
                await submitVenueSuggestion(token ?? undefined, {
                  name: venueName.trim(),
                  instagram_handle: venueInstagram.trim() || null,
                  additionalInfo: venueNotes.trim() || null,
                });

                setVenueName("");
                setVenueInstagram("");
                setVenueNotes("");
                venueSheetRef.current?.close();
              } catch (error) {
                Alert.alert(
                  t("sendFailed"),
                  error instanceof Error ? error.message : String(error),
                );
              }
            }}
            className="mt-4 w-full gap-2"
          >
            <Send size={16} color="#fff" />

            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#fff",
              }}
            >
              {t("send")}
            </Text>
          </Button>
        </BottomSheetView>
      </BottomSheetModal>

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
