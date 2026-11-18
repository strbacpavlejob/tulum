import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { toast } from "sonner-native";
import { deleteGuestPhoto, uploadGuestPhoto } from "@/lib/api";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Camera, Check, Trash2 } from "lucide-react-native";
import LoadingIndicator from "@/components/loading-indicator";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function PhotoPickerStep({
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
  launchEmailOptIn,
  onLaunchEmailOptInChange,
  launchEmailLabel,
  launchEmailNote,
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
  launchEmailOptIn: boolean;
  onLaunchEmailOptInChange: (optIn: boolean) => void;
  launchEmailLabel: string;
  launchEmailNote: string;
}) {
  const theme = useAppTheme();
  const { getToken } = useAuth();

  const mergePhotoUrls = (current: string[], incoming: string[]) => {
    // During onboarding, backend may return only the latest uploaded URL
    // before the guest row exists. Merge to avoid overriding prior picks.
    const merged = [...current];
    for (const url of incoming) {
      if (!merged.includes(url)) merged.push(url);
    }
    return merged.slice(0, 3);
  };

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      // A toast, not Alert.alert: Alert.alert does nothing on web.
      toast.error(permissionTitle, { description: permissionMessage });
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
      onPhotosChange(mergePhotoUrls(photos, updatedUrls));
    } catch (err) {
      toast.error(uploadFailedTitle, {
        description: err instanceof Error ? err.message : String(err),
      });
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
      const fallbackUrls = photos.filter((u) => u !== url);
      onPhotosChange(updatedUrls.length ? updatedUrls : fallbackUrls);
    } catch (err) {
      toast.error(removeFailedTitle, {
        description: err instanceof Error ? err.message : String(err),
      });
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
              className="w-[30%] aspect-[3/4] overflow-hidden rounded-2xl bg-light-backgroundMuted dark:bg-dark-backgroundMuted"
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
                    <LoadingIndicator />
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
                        <Text className="text-center text-[11px] text-light-colorMuted dark:text-dark-colorMuted">
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
      <Text className="mt-4 text-center text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
        {photosCounter(photos.length)}
      </Text>

      {/* Consent for later: never ticked for the guest. */}
      <Pressable
        onPress={() => onLaunchEmailOptInChange(!launchEmailOptIn)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: launchEmailOptIn }}
        className="mt-8 flex-row items-start gap-3 rounded-2xl bg-light-backgroundMuted p-4 dark:bg-dark-backgroundMuted"
      >
        <View
          className={cn(
            "mt-0.5 h-6 w-6 items-center justify-center rounded-md border-[1.5px]",
            launchEmailOptIn
              ? "border-light-color bg-light-color dark:border-dark-color dark:bg-dark-color"
              : "border-light-colorMuted dark:border-dark-colorMuted",
          )}
        >
          {launchEmailOptIn && <Check size={14} color="#fff" />}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] text-light-colorStrong dark:text-dark-colorStrong">
            {launchEmailLabel}
          </Text>
          <Text className="mt-1 text-[13px] text-light-colorMuted dark:text-dark-colorMuted">
            {launchEmailNote}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
