import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { Match } from "@/types/chat";
import {
  CHAT_AVATAR_SIZE,
  CHAT_RING_SIZE,
  formatLastMessageTime,
  formatTimeRemaining,
  isChatExpired,
  ringColor,
} from "./inbox-model";
import { TimerRing } from "./timer-ring";

interface ChatListItemProps {
  item: Match;
  /** Opens the chat, once its location check passes. */
  onOpen: (match: Match) => void;
  /** Says the chat has ended. */
  onExpired: () => void;
}

/** A chat in the inbox list, with the time it has left. */
export function ChatListItem({ item, onOpen, onExpired }: ChatListItemProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const timeRemaining = formatTimeRemaining(item.expiresAt);
  const isExpired = timeRemaining === "Expired";
  const expiryColor = isExpired ? theme.gray10 : ringColor(item.expiresAt);
  const avatarMargin = (CHAT_RING_SIZE - CHAT_AVATAR_SIZE) / 2;

  return (
    <Pressable
      style={{ opacity: isExpired ? 0.5 : 1 }}
      onPress={() => {
        if (isChatExpired(item.expiresAt)) {
          onExpired();
          return;
        }
        onOpen(item);
      }}
    >
      <View className="flex-row items-center gap-3 border-b border-light-gray3 px-4 py-3 dark:border-dark-gray3">
        <View style={{ width: CHAT_RING_SIZE, height: CHAT_RING_SIZE }}>
          <Image
            source={{ uri: item.photo }}
            style={{
              width: CHAT_AVATAR_SIZE,
              height: CHAT_AVATAR_SIZE,
              borderRadius: CHAT_AVATAR_SIZE / 2,
              margin: avatarMargin,
            }}
            contentFit="cover"
            cachePolicy="disk"
          />
          <TimerRing expiresAt={item.expiresAt} size={CHAT_RING_SIZE} />
        </View>

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[17px] font-semibold text-light-gray12 dark:text-dark-gray12">
              {item.name}
            </Text>
            <Text className="text-[13px] text-light-gray10 dark:text-dark-gray10">
              {formatLastMessageTime(item.lastMessageTime)}
            </Text>
          </View>

          <Text className="mb-px text-sm text-light-gray10 dark:text-dark-gray10">
            at {item.venue}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text
              className="flex-1 text-[15px] text-light-gray10 dark:text-dark-gray10"
              numberOfLines={1}
            >
              {item.lastMessage || t("sayHello")}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: expiryColor,
                fontWeight: "600",
                marginLeft: 8,
              }}
            >
              {timeRemaining}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
