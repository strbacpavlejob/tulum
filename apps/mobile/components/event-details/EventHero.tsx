import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, Share2 } from "lucide-react-native";
import FavoriteButton from "@/components/FavoriteButton";
import { Marquee } from "@/components/ui/marquee";
import { Text } from "@/components/ui/text";
import { TagsMarquee } from "@/components/ui/tags-marquee";
import Tags from "@/components/Tags";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Event } from "@/types/event";

interface EventHeroProps {
  event: Event;
  handleBackPress: () => void;
  handleShare: () => Promise<void>;
}

export function EventHero({
  event,
  handleBackPress,
  handleShare,
}: EventHeroProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: "32%" }} className="overflow-hidden">
      <Image
        source={{ uri: event.image || undefined }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        cachePolicy="disk"
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: `${theme.background}99`,
        }}
      />

      {/* Back button — top left */}
      <Pressable
        onPress={handleBackPress}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.background075,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ArrowLeft size={20} color={theme.colorStrong} />
      </Pressable>

      {/* Favorite + Share buttons — top right */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          right: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.background075,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <FavoriteButton isFavorite={event.isFavorite} eventId={event.id} />
        </View>

        <Pressable
          onPress={handleShare}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.background075,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel={t("share")}
        >
          <Share2 size={18} color={theme.colorStrong} />
        </Pressable>
      </View>

      <View className="absolute bottom-0 left-0 right-0 p-4">
        <View className="flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-500/30">
            <Image
              source={{ uri: event.venue_picture ?? undefined }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="disk"
            />
          </View>

          <View className="flex-1 pb-1">
            <Marquee active>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.colorStrong,
                }}
                numberOfLines={1}
              >
                {event.title}
              </Text>
            </Marquee>

            <View className="flex-row flex-wrap gap-2 mt-2">
              <TagsMarquee active>
                <Tags tags={event.tags} />
              </TagsMarquee>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
